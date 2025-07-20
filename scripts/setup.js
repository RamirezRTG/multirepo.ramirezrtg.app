
/*
================================================================================
File: scripts/setup.js (Enhanced with Intelligent Caching)
Description: Main orchestrator for the multirepo setup process.
             Coordinates the three-phase execution model with enhanced support
             for existing local projects, structured logging, and intelligent caching:
             1. Pre-clone validation
             2. Repository cloning/local project handling
             3. Post-clone setup
================================================================================
*/

import chalk from 'chalk';
import {
    defaultLogger,
    groupEnd,
    groupEndAll,
    groupStart,
    log,
    logError,
    logInfo,
    logSuccess,
    logWarn
} from './helper/logger.js';
import {checkSystemDependencies, isDryRun, loadConfiguration, validateConfiguration, validateCacheOptions, getActiveCacheOptions} from './core/config.js';
import {askQuestion, displayDryRunSummary, promptForRepositories} from './core/ui.js';
import {runHooks} from './core/hooks.js';
import {
    cloneRepository,
    ensurePackagesDirectory,
    getRepositoryPath,
    handleExistingDirectory
} from './core/repository.js';
import { CacheManager } from './helper/cache-manager.js';

// Global cache manager instance
let cacheManager = null;

/**
 * Main orchestration function with comprehensive error handling
 */
async function main() {
    // Ensure clean logging state
    groupEndAll();

    try {
        groupStart('Multirepo Setup');

        // Log startup information
        log(`Arguments received: ${process.argv.slice(2).join(' ')}`);

        // Validate cache options
        const cacheValidation = validateCacheOptions();
        if (!cacheValidation.valid) {
            logError('Invalid cache options:');
            cacheValidation.errors.forEach(error => logError(`  ${error}`));
            process.exit(1);
        }

        if (isDryRun) {
            logWarn(chalk.bold('Running in DRY RUN mode. No file system changes will be made.'));
        }

        // Initialize cache manager
        logInfo('Initializing cache manager...');
        cacheManager = new CacheManager();
        await cacheManager.initialize();
        logInfo(`Cache mode: ${getActiveCacheOptions()}`);

        logInfo("Starting multirepo setup process...");

        // === CONFIGURATION AND VALIDATION ===
        const {config, reposToProcess} = await initializeAndValidate();

        // Display cache information
        cacheManager.displayCacheInfo(reposToProcess);

        if (isDryRun) {
            displayDryRunSummary(reposToProcess);
            return;
        }

        // === THREE-PHASE EXECUTION ===
        await executeSetupPhases(reposToProcess);

        // === COMPLETION ===
        logSuccess(chalk.white('Multirepo setup completed successfully!'));
        displaySetupSummary(reposToProcess);

        // Save cache data
        await cacheManager.save();
        logInfo('Cache data saved successfully');

    } catch (error) {
        logError(`Setup failed: ${error.message}`);
        if (process.env.NODE_ENV === 'development') {
            logError(error.stack);
        }
        process.exit(1);
    } finally {
        // Ensure all groups are closed
        groupEndAll();
    }
}

/**
 * Initialize configuration and validate setup
 */
async function initializeAndValidate() {
    groupStart('Initialization & Validation');

    try {
        // System dependency checks
        logInfo('Checking system dependencies...');
        checkSystemDependencies();
        logSuccess('System dependencies verified');

        // Load and validate configuration
        logInfo('Loading configuration...');
        const config = await loadConfiguration();
        logSuccess('Configuration loaded successfully');

        // Validate repository configuration
        logInfo('Validating repository configurations...');
        if (!(await validateConfiguration(config.repos, askQuestion))) {
            throw new Error('Repository configuration validation failed');
        }
        logSuccess('Repository configurations validated');

        // User repository selection
        logInfo('Prompting for repository selection...');
        const reposToProcess = await promptForRepositories(config.repos);
        logSuccess(`Selected repositories: ${chalk.white(reposToProcess.map(r => r.name).join(', '))}`);

        return {config, reposToProcess};

    } finally {
        groupEnd();
    }
}

/**
 * Execute all setup phases with proper error handling
 */
async function executeSetupPhases(repos) {
    try {
        await runPreClonePhase(repos);
        await runClonePhase(repos);
        await runPostClonePhase(repos);
    } catch (error) {
        logError('Phase execution failed. Cleaning up...');
        throw error;
    }
}

/**
 * Phase 1: Environment validation for all repositories
 */
async function runPreClonePhase(repos) {
    groupStart('Phase 1: Environment Validation');

    try {
        logInfo(`Validating environment for ${chalk.cyan(repos.length)} repositories...`);

        for (const repo of repos) {
            groupStart(`Pre-clone validation: ${repo.name}`);

            try {
                const repoPath = getRepositoryPath(repo.name);

                // Check if preClone can be skipped
                if (cacheManager.canSkipPreClone(repo, repoPath)) {
                    logSuccess('Environment validation skipped (cached)');
                    repo._preCloneSkipped = true;
                } else {
                    const context = {
                        cwd: repoPath,
                        repo: repo,
                        logger: defaultLogger
                    };

                    logInfo('Running environment checks...');
                    await runHooks(repo, 'preClone', context);
                    logSuccess('Environment validation completed');

                    // Update cache after successful preClone
                    await cacheManager.updateAfterSuccess(repo, repoPath, 'preClone', true);
                }

            } catch (error) {
                logError(`Pre-clone validation failed for '${repo.name}': ${error.message}`);

                // Update cache after failed preClone
                const repoPath = getRepositoryPath(repo.name);
                await cacheManager.updateAfterFailure(repo, repoPath, 'preClone');

                throw error;
            } finally {
                groupEnd();
            }
        }

        const skippedCount = repos.filter(r => r._preCloneSkipped).length;
        if (skippedCount > 0) {
            logSuccess(`Environment validation completed: ${chalk.cyan(repos.length - skippedCount)} executed, ${chalk.cyan(skippedCount)} cached`);
        } else {
            logSuccess('All environment validations completed successfully');
        }

    } finally {
        groupEnd();
    }
}

/**
 * Phase 2: Clone all repositories or handle existing projects
 */
async function runClonePhase(repos) {
    groupStart('Phase 2: Repository Setup');

    try {
        // Ensure packages directory exists
        groupStart('Directory Preparation');
        logInfo('Ensuring packages directory exists...');
        ensurePackagesDirectory();
        logSuccess('Packages directory ready');
        groupEnd();

        // Process each repository
        logInfo(`Processing ${chalk.cyan(repos.length)} repositories...`);

        for (const repo of repos) {
            groupStart(`Repository setup: ${repo.name}`);

            try {
                const repoPath = getRepositoryPath(repo.name);

                // Handle existing directories
                logInfo('Checking for existing directory...');
                const skipClone = await handleExistingDirectory(repo, repoPath, askQuestion);

                if (skipClone && !repo._existingProject) {
                    repo._skipClone = true;
                    logInfo('Repository setup skipped by user choice');
                } else {
                    // Clone or setup repository
                    logInfo('Setting up repository...');
                    await cloneRepository(repo, repoPath);

                    if (repo._existingProject) {
                        logSuccess('Existing project configured');
                    } else if (repo._createEmptyFolder) {
                        logSuccess('Empty folder created');
                    } else {
                        logSuccess('Repository cloned successfully');
                    }
                }

            } catch (error) {
                logError(`Repository setup failed for '${repo.name}': ${error.message}`);
                throw error;
            } finally {
                groupEnd();
            }
        }

        const processedCount = repos.filter(r => !r._skipClone || r._existingProject).length;
        logSuccess(`Repository setup completed: ${chalk.cyan(processedCount)}/${chalk.cyan(repos.length)} repositories processed`);

    } finally {
        groupEnd();
    }
}

/**
 * Phase 3: Setup and configuration for all repositories
 */
async function runPostClonePhase(repos) {
    groupStart('Phase 3: Project Validation & Setup');

    try {
        const reposToProcess = repos.filter(r => !r._skipClone || r._existingProject);
        logInfo(`Running post-clone setup for ${chalk.cyan(reposToProcess.length)} repositories...`);

        for (const repo of reposToProcess) {
            const projectType = repo._existingProject ? 'existing project' :
                repo._createEmptyFolder ? 'empty project' : 'cloned repository';

            groupStart(`Project setup: ${repo.name} (${projectType})`);

            try {
                const repoPath = getRepositoryPath(repo.name);

                // Check if postClone can be skipped
                if (cacheManager.canSkipPostClone(repo, repoPath)) {
                    logSuccess('Project setup skipped (cached)');
                    repo._postCloneSkipped = true;
                } else {
                    const context = {
                        cwd: repoPath,
                        repo: repo,
                        logger: defaultLogger
                    };

                    logInfo('Running trait-based validations and setup...');
                    await runHooks(repo, 'postClone', context);
                    logSuccess('Project setup completed successfully');

                    // Update cache after successful postClone
                    await cacheManager.updateAfterSuccess(repo, repoPath, 'postClone', true);
                }

            } catch (error) {
                logError(`Post-clone setup failed for '${repo.name}': ${error.message}`);

                // Update cache after failed postClone
                const repoPath = getRepositoryPath(repo.name);
                await cacheManager.updateAfterFailure(repo, repoPath, 'postClone');

                // Continue with other repositories but log the failure
                logWarn('Continuing with remaining repositories...');
                repo._setupFailed = true;

            } finally {
                groupEnd();
            }
        }

        const successCount = reposToProcess.filter(r => !r._setupFailed).length;
        const failedCount = reposToProcess.filter(r => r._setupFailed).length;
        const skippedCount = reposToProcess.filter(r => r._postCloneSkipped).length;

        if (failedCount > 0) {
            logWarn(`Project setup completed with ${chalk.yellow(failedCount)} failures out of ${chalk.cyan(reposToProcess.length)} repositories`);
        } else {
            const executedCount = successCount - skippedCount;
            if (skippedCount > 0) {
                logSuccess(`Project setup completed: ${chalk.cyan(executedCount)} executed, ${chalk.cyan(skippedCount)} cached, ${chalk.cyan(successCount)} total successful`);
            } else {
                logSuccess(`All project setups completed successfully: ${chalk.cyan(successCount)} repositories`);
            }
        }

    } finally {
        groupEnd();
    }
}

/**
 * Display comprehensive setup summary (enhanced with cache information)
 */
function displaySetupSummary(repos) {
    groupStart('Setup Summary');

    try {
        const cloned = repos.filter(r => !r._skipClone && !r._existingProject && !r._createEmptyFolder);
        const existing = repos.filter(r => r._existingProject);
        const created = repos.filter(r => r._createEmptyFolder);
        const skipped = repos.filter(r => r._skipClone && !r._existingProject);
        const failed = repos.filter(r => r._setupFailed);

        // Cache statistics
        const preCloneSkipped = repos.filter(r => r._preCloneSkipped).length;
        const postCloneSkipped = repos.filter(r => r._postCloneSkipped).length;

        // Group summary by outcome
        if (cloned.length > 0) {
            groupStart('Successfully Cloned');
            cloned.forEach(repo => {
                const status = repo._setupFailed ? chalk.yellow(' (setup failed)') : '';
                logSuccess(`${chalk.white(repo.name)}${status}`);
            });
            groupEnd();
        }

        if (existing.length > 0) {
            groupStart('Existing Projects Processed');
            existing.forEach(repo => {
                const status = repo._setupFailed ? chalk.yellow(' (setup failed)') : '';
                logSuccess(`${chalk.white(repo.name)}${status}`);
            });
            groupEnd();
        }

        if (created.length > 0) {
            groupStart('Empty Folders Created');
            created.forEach(repo => {
                const status = repo._setupFailed ? chalk.yellow(' (setup failed)') : '';
                logInfo(`${chalk.white(repo.name)}${status}`);
            });
            groupEnd();
        }

        if (skipped.length > 0) {
            groupStart('Skipped Repositories');
            skipped.forEach(repo => logWarn(`${chalk.white(repo.name)}`));
            groupEnd();
        }

        if (failed.length > 0) {
            groupStart('Setup Failures');
            failed.forEach(repo => logError(`${chalk.white(repo.name)} - Post-clone setup failed`));
            groupEnd();
        }

        // Overall statistics with cache info
        groupStart('Statistics');
        const totalProcessed = repos.length - skipped.length;
        const totalSuccessful = totalProcessed - failed.length;

        logInfo(`Total repositories: ${chalk.cyan(repos.length)}`);
        logInfo(`Processed: ${chalk.cyan(totalProcessed)}`);
        logInfo(`Successful: ${chalk.green(totalSuccessful)}`);
        if (skipped.length > 0) logInfo(`Skipped: ${chalk.yellow(skipped.length)}`);
        if (failed.length > 0) logInfo(`Failed: ${chalk.red(failed.length)}`);

        // Cache optimization info
        if (preCloneSkipped > 0 || postCloneSkipped > 0) {
            groupStart('Cache Optimization');
            if (preCloneSkipped > 0) {
                logInfo(`PreClone operations cached: ${chalk.cyan(preCloneSkipped)}/${chalk.cyan(repos.length)}`);
            }
            if (postCloneSkipped > 0) {
                logInfo(`PostClone operations cached: ${chalk.cyan(postCloneSkipped)}/${chalk.cyan(totalProcessed)}`);
            }
            const totalOperations = (repos.length * 2) - skipped.length; // preClone for all, postClone for processed
            const totalCached = preCloneSkipped + postCloneSkipped;
            const cacheEfficiency = Math.round((totalCached / totalOperations) * 100);
            logInfo(`Cache efficiency: ${chalk.cyan(`${cacheEfficiency}%`)} (${totalCached}/${totalOperations} operations cached)`);
            groupEnd();
        }

        const successRate = Math.round((totalSuccessful / repos.length) * 100);
        logInfo(`Success rate: ${chalk.cyan(`${successRate}%`)}`);
        groupEnd();

    } finally {
        groupEnd();
    }
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Promise Rejection:', reason);
    groupEndAll();
    process.exit(1);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
    logError('Uncaught Exception:', error.message);
    if (process.env.NODE_ENV === 'development') {
        logError(error.stack);
    }
    groupEndAll();
    process.exit(1);
});

// Graceful shutdown handler
process.on('SIGINT', () => {
    logWarn('Received SIGINT. Performing graceful shutdown...');
    groupEndAll();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logWarn('Received SIGTERM. Performing graceful shutdown...');
    groupEndAll();
    process.exit(0);
});

// Start the main execution
main();