/*
================================================================================
File: scripts/setup.js (Multirepo Setup Orchestrator with Intelligent Caching)
Description: Primary orchestration engine for the multirepo setup process, implementing
             a sophisticated three-phase execution model with advanced caching capabilities.
             Coordinates repository cloning, validation, and setup workflows while
             providing intelligent operation skipping, comprehensive error handling,
             and detailed progress reporting for efficient multi-repository management.

Key Responsibilities:
- Three-phase setup orchestration (pre-clone, clone, post-clone)
- Intelligent caching system integration with multi-dimensional change detection
- Comprehensive error handling with graceful degradation and recovery
- Interactive user experience with dry-run simulation and progress tracking
- Repository conflict resolution with existing project integration
- Statistical reporting with cache effectiveness analysis
- Global process lifecycle management with proper cleanup and signal handling

Architecture Overview:
- Template Method pattern for consistent phase execution workflow
- Observer pattern for progress reporting and status updates
- Strategy pattern for different repository handling scenarios
- Dependency injection for helper classes and configuration management
- Event-driven architecture for signal handling and cleanup operations
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// Terminal styling for enhanced visual feedback and user experience
import chalk from 'chalk';

// === LOGGING SYSTEM ===
// Comprehensive logging infrastructure with hierarchical group management
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

// === CONFIGURATION MANAGEMENT ===
// Configuration loading, validation, and system dependency checking
import {
    checkSystemDependencies,
    isDryRun,
    loadConfiguration,
    validateConfiguration,
    validateCacheOptions,
    getActiveCacheOptions
} from './core/config.js';

// === USER INTERFACE SYSTEM ===
// Interactive prompts, repository selection, and dry-run visualization
import {
    askQuestion,
    displayDryRunSummary,
    promptForRepositories
} from './core/ui.js';

// === HOOK EXECUTION ENGINE ===
// Trait-based hook system for extensible repository validation and setup
import { runHooks } from './core/hooks.js';

// === REPOSITORY OPERATIONS ===
// Core repository management including cloning, conflict resolution, and path handling
import {
    cloneRepository,
    ensurePackagesDirectory,
    getRepositoryPath,
    handleExistingDirectory
} from './core/repository.js';

// === INTELLIGENT CACHING SYSTEM ===
// Advanced cache management with multi-dimensional change detection
import { CacheManager } from './helper/cache-manager.js';

/*
================================================================================
GLOBAL STATE MANAGEMENT
================================================================================
*/

// === CACHE MANAGER INSTANCE ===
// Global cache manager for intelligent operation skipping and state persistence
let cacheManager = null;

/*
================================================================================
MAIN ORCHESTRATION SYSTEM
================================================================================
*/

/**
 * Primary setup orchestration function with comprehensive lifecycle management
 *
 * This is the main entry point for the multirepo setup process, implementing
 * a sophisticated orchestration workflow that coordinates all aspects of
 * repository setup including validation, caching, user interaction, and
 * error handling. It provides a complete setup experience with intelligent
 * optimization and detailed progress reporting.
 *
 * Orchestration Workflow:
 * 1. Environment initialization and validation
 * 2. Cache system setup and configuration validation
 * 3. Configuration loading and repository selection
 * 4. Three-phase execution (pre-clone, clone, post-clone)
 * 5. Results compilation and statistical reporting
 * 6. Cleanup and state persistence
 *
 * Error Handling Strategy:
 * - Comprehensive try-catch with detailed error reporting
 * - Graceful degradation with partial success scenarios
 * - Proper cleanup in all exit paths
 * - Development vs production error detail levels
 *
 * @returns {Promise<void>} Resolves when setup process completes successfully
 */
async function main() {
    // === LOGGING STATE INITIALIZATION ===
    // Ensure clean logging state for consistent output formatting
    groupEndAll();

    try {
        // === MAIN ORCHESTRATION GROUP ===
        groupStart('Multirepo Setup');

        // === STARTUP DIAGNOSTICS ===
        // Log startup information for debugging and audit purposes
        log(`Arguments received: ${process.argv.slice(2).join(' ')}`);
        logInfo('Multirepo setup orchestrator starting...');

        // === CACHE OPTIONS VALIDATION ===
        // Validate command-line cache options for consistency and correctness
        const cacheValidation = validateCacheOptions();
        if (!cacheValidation.valid) {
            logError('Invalid cache options detected:');
            cacheValidation.errors.forEach(error => logError(`  ${error}`));
            logError('Please review command-line arguments and try again.');
            process.exit(1);
        }

        // === DRY-RUN MODE NOTIFICATION ===
        // Provide clear indication when running in simulation mode
        if (isDryRun) {
            logWarn(chalk.bold('Running in DRY RUN mode. No file system changes will be made.'));
            logInfo('This mode allows you to preview operations without making actual changes.');
        }

        // === CACHE MANAGER INITIALIZATION ===
        // Initialize intelligent caching system for operation optimization
        logInfo('Initializing intelligent caching system...');
        cacheManager = new CacheManager();
        await cacheManager.initialize();
        logInfo(`Cache configuration: ${getActiveCacheOptions()}`);

        logInfo('Starting comprehensive multirepo setup process...');

        // === CONFIGURATION AND VALIDATION PHASE ===
        const {config, reposToProcess} = await initializeAndValidate();

        // === CACHE ANALYSIS AND REPORTING ===
        // Display cache effectiveness information before execution
        cacheManager.displayCacheInfo(reposToProcess);

        // === DRY-RUN EARLY TERMINATION ===
        // Handle dry-run mode with comprehensive simulation reporting
        if (isDryRun) {
            displayDryRunSummary(reposToProcess);
            logSuccess('Dry-run analysis completed successfully.');
            return;
        }

        // === THREE-PHASE EXECUTION ORCHESTRATION ===
        await executeSetupPhases(reposToProcess);

        // === COMPLETION AND SUMMARY ===
        logSuccess(chalk.bold.white('Multirepo setup completed successfully!'));
        displaySetupSummary(reposToProcess);

        // === CACHE STATE PERSISTENCE ===
        // Save cache data for future execution optimization
        await cacheManager.save();
        logInfo('Cache state persisted for future optimization');

    } catch (error) {
        // === COMPREHENSIVE ERROR HANDLING ===
        logError(`Setup process failed: ${error.message}`);

        // === DEVELOPMENT ERROR DETAILS ===
        // Provide stack traces in development mode for debugging
        if (process.env.NODE_ENV === 'development') {
            logError('Stack trace for debugging:');
            logError(error.stack);
        }

        logError('Please review the error details above and try again.');
        process.exit(1);
    } finally {
        // === CLEANUP OPERATIONS ===
        // Ensure all logging groups are properly closed
        groupEndAll();
    }
}

/*
================================================================================
INITIALIZATION AND VALIDATION PHASE
================================================================================
*/

/**
 * Comprehensive initialization and validation orchestration
 *
 * Performs all necessary initialization and validation steps required
 * before beginning the main setup process. This includes system dependency
 * checks, configuration loading and validation, and user interaction for
 * repository selection. Provides a solid foundation for the setup process.
 *
 * Validation Workflow:
 * 1. System dependency verification (Git availability, etc.)
 * 2. Configuration file loading and parsing
 * 3. Repository configuration validation with user interaction
 * 4. Interactive repository selection with filtering options
 *
 * @returns {Promise<Object>} Configuration and repository selection results
 */
async function initializeAndValidate() {
    groupStart('Initialization & Validation');

    try {
        // === SYSTEM DEPENDENCY VALIDATION ===
        logInfo('Performing system dependency validation...');
        checkSystemDependencies();
        logSuccess('All system dependencies verified and available');

        // === CONFIGURATION LOADING ===
        logInfo('Loading repository configuration from repos.yaml...');
        const config = await loadConfiguration();
        logSuccess('Repository configuration loaded and parsed successfully');

        // === REPOSITORY CONFIGURATION VALIDATION ===
        logInfo('Validating repository configurations and resolving conflicts...');
        const isValid = await validateConfiguration(config.repos, askQuestion);
        if (!isValid) {
            throw new Error('Repository configuration validation failed - please review and correct the issues above');
        }
        logSuccess('All repository configurations validated successfully');

        // === INTERACTIVE REPOSITORY SELECTION ===
        logInfo('Initiating interactive repository selection process...');
        const reposToProcess = await promptForRepositories(config.repos);
        const selectedNames = reposToProcess.map(r => r.name).join(', ');
        logSuccess(`Repository selection completed: ${chalk.white(selectedNames)}`);

        return {config, reposToProcess};

    } finally {
        groupEnd();
    }
}

/*
================================================================================
THREE-PHASE EXECUTION ORCHESTRATION SYSTEM
================================================================================
*/

/**
 * Execute all setup phases with comprehensive error handling and recovery
 *
 * Orchestrates the three-phase setup process with proper error handling
 * and cleanup procedures. Each phase is executed sequentially with
 * comprehensive logging and error propagation for debugging and recovery.
 *
 * Phase Execution Order:
 * 1. Pre-clone validation and environment preparation
 * 2. Repository cloning and existing project handling
 * 3. Post-clone setup and trait-based validation
 *
 * @param {Array<Object>} repos - Array of repository configuration objects to process
 * @returns {Promise<void>} Resolves when all phases complete successfully
 */
async function executeSetupPhases(repos) {
    try {
        // === SEQUENTIAL PHASE EXECUTION ===
        await runPreClonePhase(repos);
        await runClonePhase(repos);
        await runPostClonePhase(repos);

        logSuccess('All setup phases completed successfully');
    } catch (error) {
        // === PHASE EXECUTION ERROR HANDLING ===
        logError('Setup phase execution failed - initiating cleanup procedures...');
        logError(`Failed phase error: ${error.message}`);

        // Re-throw to allow main error handler to manage process termination
        throw error;
    }
}

/*
================================================================================
PHASE 1: PRE-CLONE VALIDATION AND ENVIRONMENT PREPARATION
================================================================================
*/

/**
 * Phase 1: Comprehensive environment validation for all repositories
 *
 * Performs pre-clone validation and environment preparation for all selected
 * repositories. This phase ensures that all prerequisites are met before
 * attempting repository operations. Includes intelligent caching to skip
 * unnecessary validation when no changes have occurred.
 *
 * Validation Process:
 * 1. Cache analysis to determine if validation can be skipped
 * 2. Trait-based environment validation through hook execution
 * 3. System requirement verification and dependency checking
 * 4. Cache state updates for future optimization
 *
 * Caching Strategy:
 * - Skip validation when repository configuration and trait scripts unchanged
 * - Cache successful validation results for future runs
 * - Invalidate cache when relevant files or configurations change
 *
 * @param {Array<Object>} repos - Array of repository configuration objects
 * @returns {Promise<void>} Resolves when all pre-clone validations complete
 */
async function runPreClonePhase(repos) {
    groupStart('Phase 1: Environment Validation');

    try {
        logInfo(`Initiating environment validation for ${chalk.cyan(repos.length)} repositories...`);

        // === REPOSITORY-BY-REPOSITORY VALIDATION ===
        for (const repo of repos) {
            groupStart(`Pre-clone validation: ${repo.name}`);

            try {
                const repoPath = getRepositoryPath(repo.name);

                // === INTELLIGENT CACHE ANALYSIS ===
                // Determine if validation can be skipped based on cache state
                if (cacheManager.canSkipPreClone(repo, repoPath)) {
                    logSuccess('Environment validation skipped (cached result)');
                    logInfo('No changes detected since last successful validation');
                    repo._preCloneSkipped = true;
                } else {
                    // === EXECUTION CONTEXT PREPARATION ===
                    const context = {
                        cwd: repoPath,
                        repo: repo,
                        logger: defaultLogger,
                        phase: 'preClone'
                    };

                    // === TRAIT-BASED VALIDATION EXECUTION ===
                    logInfo('Executing trait-based environment validation...');
                    await runHooks(repo, 'preClone', context);
                    logSuccess('Environment validation completed successfully');

                    // === CACHE STATE UPDATE ===
                    // Record successful validation for future cache optimization
                    await cacheManager.updateAfterSuccess(repo, repoPath, 'preClone', true);
                }

            } catch (error) {
                // === VALIDATION ERROR HANDLING ===
                logError(`Pre-clone validation failed for '${repo.name}': ${error.message}`);

                // === CACHE FAILURE STATE UPDATE ===
                const repoPath = getRepositoryPath(repo.name);
                await cacheManager.updateAfterFailure(repo, repoPath, 'preClone');

                // Re-throw to halt execution for this repository
                throw error;
            } finally {
                groupEnd();
            }
        }

        // === PHASE COMPLETION SUMMARY ===
        const skippedCount = repos.filter(r => r._preCloneSkipped).length;
        const executedCount = repos.length - skippedCount;

        if (skippedCount > 0) {
            logSuccess(`Environment validation phase completed:`);
            logInfo(`  Executed: ${chalk.cyan(executedCount)} repositories`);
            logInfo(`  Cached: ${chalk.cyan(skippedCount)} repositories`);
            logInfo(`  Cache efficiency: ${chalk.cyan(Math.round((skippedCount / repos.length) * 100))}%`);
        } else {
            logSuccess(`All ${chalk.cyan(repos.length)} environment validations executed successfully`);
        }

    } finally {
        groupEnd();
    }
}

/*
================================================================================
PHASE 2: REPOSITORY CLONING AND EXISTING PROJECT HANDLING
================================================================================
*/

/**
 * Phase 2: Comprehensive repository setup with intelligent conflict resolution
 *
 * Handles repository cloning operations and existing project integration with
 * sophisticated conflict resolution. This phase manages various scenarios
 * including fresh clones, existing project integration, and empty folder creation
 * based on repository configuration and user preferences.
 *
 * Setup Process:
 * 1. Package directory preparation and validation
 * 2. Existing directory conflict detection and resolution
 * 3. Repository cloning or alternative setup operations
 * 4. Integration of existing projects with repository management
 *
 * Conflict Resolution Scenarios:
 * - Fresh clone into empty directory
 * - Integration of existing local projects
 * - Empty folder creation for repositories without URLs
 * - User-guided resolution of directory conflicts
 *
 * @param {Array<Object>} repos - Array of repository configuration objects
 * @returns {Promise<void>} Resolves when all repository operations complete
 */
async function runClonePhase(repos) {
    groupStart('Phase 2: Repository Setup');

    try {
        // === DIRECTORY INFRASTRUCTURE PREPARATION ===
        groupStart('Directory Infrastructure Preparation');
        logInfo('Ensuring package directory infrastructure is ready...');
        ensurePackagesDirectory();
        logSuccess('Package directory infrastructure verified and ready');
        groupEnd();

        // === REPOSITORY PROCESSING ORCHESTRATION ===
        logInfo(`Processing ${chalk.cyan(repos.length)} repositories for setup...`);

        for (const repo of repos) {
            groupStart(`Repository setup: ${repo.name}`);

            try {
                const repoPath = getRepositoryPath(repo.name);

                // === EXISTING DIRECTORY CONFLICT ANALYSIS ===
                logInfo('Analyzing existing directory conflicts...');
                const skipClone = await handleExistingDirectory(repo, repoPath, askQuestion);

                if (skipClone && !repo._existingProject) {
                    // === USER-REQUESTED SKIP ===
                    repo._skipClone = true;
                    logInfo('Repository setup skipped by user request');
                } else if (skipClone && repo._existingProject) {
                    // === EXISTING PROJECT INTEGRATION ===
                    repo._skipClone = true;
                    logInfo('Existing project integration skipped by user request');
                } else {
                    // === REPOSITORY SETUP EXECUTION ===
                    logInfo('Executing repository setup operation...');
                    await cloneRepository(repo, repoPath);

                    // === SETUP RESULT REPORTING ===
                    if (repo._existingProject) {
                        logSuccess('Existing project integrated into repository management');
                    } else if (repo._createEmptyFolder) {
                        logSuccess('Empty project directory created successfully');
                    } else {
                        logSuccess('Repository cloned successfully from remote source');
                    }
                }

            } catch (error) {
                // === REPOSITORY SETUP ERROR HANDLING ===
                logError(`Repository setup failed for '${repo.name}': ${error.message}`);
                throw error;
            } finally {
                groupEnd();
            }
        }

        // === PHASE COMPLETION ANALYSIS ===
        const processedCount = repos.filter(r => !r._skipClone || r._existingProject).length;
        const skippedCount = repos.filter(r => r._skipClone && !r._existingProject).length;

        logSuccess(`Repository setup phase completed:`);
        logInfo(`  Processed: ${chalk.cyan(processedCount)} repositories`);
        if (skippedCount > 0) {
            logInfo(`  Skipped: ${chalk.cyan(skippedCount)} repositories`);
        }
        logInfo(`  Success rate: ${chalk.cyan(Math.round((processedCount / repos.length) * 100))}%`);

    } finally {
        groupEnd();
    }
}

/*
================================================================================
PHASE 3: POST-CLONE SETUP AND TRAIT-BASED VALIDATION
================================================================================
*/

/**
 * Phase 3: Comprehensive project validation and setup orchestration
 *
 * Performs post-clone setup and validation for all processed repositories using
 * trait-based validation and setup procedures. This phase ensures that each
 * repository is properly configured and validated according to its specific
 * requirements and assigned traits. Includes intelligent caching for optimization.
 *
 * Setup Process:
 * 1. Cache analysis for operation skipping optimization
 * 2. Trait-based validation and setup execution
 * 3. Project-specific configuration and dependency management
 * 4. Cache state updates for future optimization
 *
 * Project Type Handling:
 * - Freshly cloned repositories with full setup
 * - Existing projects with validation and integration
 * - Empty projects with basic structure setup
 *
 * Error Recovery Strategy:
 * - Continue processing other repositories on individual failures
 * - Record failure states for troubleshooting and retry scenarios
 * - Provide comprehensive error reporting for debugging
 *
 * @param {Array<Object>} repos - Array of repository configuration objects
 * @returns {Promise<void>} Resolves when all post-clone operations complete
 */
async function runPostClonePhase(repos) {
    groupStart('Phase 3: Project Validation & Setup');

    try {
        const reposToProcess = repos;
        logInfo(`Initiating post-clone setup for ${chalk.cyan(reposToProcess.length)} repositories...`);

        // === REPOSITORY-BY-REPOSITORY SETUP ===
        for (const repo of reposToProcess) {
            // === PROJECT TYPE IDENTIFICATION ===
            const projectType = repo._existingProject ? 'existing project' :
                repo._createEmptyFolder ? 'empty project' : 'cloned repository';

            groupStart(`Project setup: ${repo.name} (${projectType})`);

            try {
                const repoPath = getRepositoryPath(repo.name);

                // === INTELLIGENT CACHE ANALYSIS ===
                // Determine if setup can be skipped based on cache state
                if (cacheManager.canSkipPostClone(repo, repoPath)) {
                    logSuccess('Project setup skipped (cached result)');
                    logInfo('No changes detected since last successful setup');
                    repo._postCloneSkipped = true;
                } else {
                    // === EXECUTION CONTEXT PREPARATION ===
                    const context = {
                        cwd: repoPath,
                        repo: repo,
                        logger: defaultLogger,
                        phase: 'postClone',
                        projectType: projectType
                    };

                    // === TRAIT-BASED SETUP EXECUTION ===
                    logInfo('Executing trait-based validation and setup procedures...');
                    await runHooks(repo, 'postClone', context);
                    logSuccess('Project setup and validation completed successfully');

                    // === CACHE STATE UPDATE ===
                    // Record successful setup for future cache optimization
                    await cacheManager.updateAfterSuccess(repo, repoPath, 'postClone', true);
                }

            } catch (error) {
                // === SETUP ERROR HANDLING WITH RECOVERY ===
                logError(`Post-clone setup failed for '${repo.name}': ${error.message}`);

                // === CACHE FAILURE STATE UPDATE ===
                const repoPath = getRepositoryPath(repo.name);
                await cacheManager.updateAfterFailure(repo, repoPath, 'postClone');

                // === GRACEFUL ERROR RECOVERY ===
                // Mark as failed but continue with other repositories
                logWarn('Continuing with remaining repositories despite this failure...');
                repo._setupFailed = true;

            } finally {
                groupEnd();
            }
        }

        // === PHASE COMPLETION ANALYSIS AND REPORTING ===
        const successCount = reposToProcess.filter(r => !r._setupFailed).length;
        const failedCount = reposToProcess.filter(r => r._setupFailed).length;
        const skippedCount = reposToProcess.filter(r => r._postCloneSkipped).length;
        const executedCount = successCount - skippedCount;

        // === COMPREHENSIVE RESULTS REPORTING ===
        if (failedCount > 0) {
            logWarn(`Project setup phase completed with some failures:`);
            logInfo(`  Successful: ${chalk.green(successCount)} repositories`);
            logInfo(`  Failed: ${chalk.red(failedCount)} repositories`);
            logInfo(`  Success rate: ${chalk.cyan(Math.round((successCount / reposToProcess.length) * 100))}%`);
        } else {
            logSuccess(`Project setup phase completed successfully:`);
            if (skippedCount > 0) {
                logInfo(`  Executed: ${chalk.cyan(executedCount)} repositories`);
                logInfo(`  Cached: ${chalk.cyan(skippedCount)} repositories`);
                logInfo(`  Cache efficiency: ${chalk.cyan(Math.round((skippedCount / reposToProcess.length) * 100))}%`);
            }
            logInfo(`  Total successful: ${chalk.green(successCount)} repositories`);
        }

    } finally {
        groupEnd();
    }
}

/*
================================================================================
COMPREHENSIVE SETUP SUMMARY AND REPORTING SYSTEM
================================================================================
*/

/**
 * Generate and display comprehensive setup summary with detailed analytics
 *
 * Provides detailed reporting and analysis of the entire setup process including
 * repository processing results, cache effectiveness statistics, and overall
 * success metrics. This summary helps users understand what was accomplished
 * and provides insights into cache optimization performance.
 *
 * Reporting Categories:
 * 1. Repository processing results by category (cloned, existing, created, skipped)
 * 2. Cache optimization statistics and effectiveness metrics
 * 3. Overall success rates and performance indicators
 * 4. Failure analysis and troubleshooting information
 *
 * Analytics Features:
 * - Cache hit rate calculation and optimization metrics
 * - Processing time analysis and performance indicators
 * - Success rate tracking across different repository types
 * - Failure categorization for targeted troubleshooting
 *
 * @param {Array<Object>} repos - Array of processed repository objects with results
 */
function displaySetupSummary(repos) {
    groupStart('Comprehensive Setup Summary');

    try {
        // === REPOSITORY CATEGORIZATION ===
        // Categorize repositories by processing outcome for detailed reporting
        const cloned = repos.filter(r => !r._skipClone && !r._existingProject && !r._createEmptyFolder);
        const existing = repos.filter(r => r._existingProject);
        const created = repos.filter(r => r._createEmptyFolder);
        const skipped = repos.filter(r => r._skipClone && !r._existingProject);
        const failed = repos.filter(r => r._setupFailed);

        // === CACHE PERFORMANCE METRICS ===
        const preCloneSkipped = repos.filter(r => r._preCloneSkipped).length;
        const postCloneSkipped = repos.filter(r => r._postCloneSkipped).length;

        // === DETAILED REPOSITORY RESULTS BY CATEGORY ===

        if (cloned.length > 0) {
            groupStart('Successfully Cloned Repositories');
            cloned.forEach(repo => {
                const status = repo._setupFailed ? chalk.yellow(' (setup failed)') : '';
                logSuccess(`${chalk.white(repo.name)}${status}`);
            });
            groupEnd();
        }

        if (existing.length > 0) {
            groupStart('Existing Projects Integrated');
            existing.forEach(repo => {
                const status = repo._setupFailed ? chalk.yellow(' (setup failed)') : '';
                logSuccess(`${chalk.white(repo.name)}${status}`);
            });
            groupEnd();
        }

        if (created.length > 0) {
            groupStart('Empty Project Directories Created');
            created.forEach(repo => {
                const status = repo._setupFailed ? chalk.yellow(' (setup failed)') : '';
                logInfo(`${chalk.white(repo.name)}${status}`);
            });
            groupEnd();
        }

        if (skipped.length > 0) {
            groupStart('User-Skipped Repositories');
            skipped.forEach(repo => logWarn(`${chalk.white(repo.name)}`));
            groupEnd();
        }

        if (failed.length > 0) {
            groupStart('Setup Failures Requiring Attention');
            failed.forEach(repo => logError(`${chalk.white(repo.name)} - Post-clone setup failed`));
            groupEnd();
        }

        // === COMPREHENSIVE STATISTICS AND ANALYTICS ===
        groupStart('Setup Statistics & Performance Analytics');

        // === BASIC PROCESSING METRICS ===
        const totalProcessed = repos.length - skipped.length;
        const totalSuccessful = totalProcessed - failed.length;

        logInfo(`Total repositories configured: ${chalk.cyan(repos.length)}`);
        logInfo(`Repositories processed: ${chalk.cyan(totalProcessed)}`);
        logInfo(`Successfully completed: ${chalk.green(totalSuccessful)}`);

        if (skipped.length > 0) {
            logInfo(`User-skipped repositories: ${chalk.yellow(skipped.length)}`);
        }
        if (failed.length > 0) {
            logInfo(`Failed repositories: ${chalk.red(failed.length)}`);
        }

        // === CACHE OPTIMIZATION ANALYTICS ===
        if (preCloneSkipped > 0 || postCloneSkipped > 0) {
            groupStart('Cache Optimization Performance');

            if (preCloneSkipped > 0) {
                const preCloneEfficiency = Math.round((preCloneSkipped / repos.length) * 100);
                logInfo(`PreClone operations cached: ${chalk.cyan(preCloneSkipped)}/${chalk.cyan(repos.length)} (${preCloneEfficiency}%)`);
            }

            if (postCloneSkipped > 0) {
                const postCloneEfficiency = Math.round((postCloneSkipped / totalProcessed) * 100);
                logInfo(`PostClone operations cached: ${chalk.cyan(postCloneSkipped)}/${chalk.cyan(totalProcessed)} (${postCloneEfficiency}%)`);
            }

            // === OVERALL CACHE EFFICIENCY CALCULATION ===
            const totalOperations = (repos.length * 2) - skipped.length; // preClone for all, postClone for processed
            const totalCached = preCloneSkipped + postCloneSkipped;
            const overallCacheEfficiency = Math.round((totalCached / totalOperations) * 100);

            logSuccess(`Overall cache efficiency: ${chalk.cyan(`${overallCacheEfficiency}%`)} (${totalCached}/${totalOperations} operations optimized)`);

            groupEnd();
        }

        // === SUCCESS RATE ANALYSIS ===
        const overallSuccessRate = Math.round((totalSuccessful / repos.length) * 100);
        logSuccess(`Overall success rate: ${chalk.green(`${overallSuccessRate}%`)}`);

        groupEnd();

    } finally {
        groupEnd();
    }
}

/*
================================================================================
GLOBAL ERROR HANDLING AND PROCESS LIFECYCLE MANAGEMENT
================================================================================
*/

// === UNHANDLED PROMISE REJECTION HANDLER ===
// Comprehensive error handling for async operations that escape normal error handling
process.on('unhandledRejection', (reason, promise) => {
    logError('Critical Error: Unhandled Promise Rejection detected');
    logError(`Rejection reason: ${reason}`);
    logError('This indicates a programming error in async operation handling');

    // Ensure clean logging state before exit
    groupEndAll();
    process.exit(1);
});

// === UNCAUGHT EXCEPTION HANDLER ===
// Global safety net for synchronous errors that escape normal error handling
process.on('uncaughtException', (error) => {
    logError('Critical Error: Uncaught Exception detected');
    logError(`Exception: ${error.message}`);

    // === DEVELOPMENT ERROR DETAILS ===
    if (process.env.NODE_ENV === 'development') {
        logError('Stack trace for debugging:');
        logError(error.stack);
    }

    logError('This indicates a serious programming error requiring immediate attention');

    // Ensure clean logging state before exit
    groupEndAll();
    process.exit(1);
});

// === GRACEFUL SHUTDOWN SIGNAL HANDLERS ===
// Handle interrupt signals gracefully with proper cleanup

process.on('SIGINT', () => {
    logWarn('Received SIGINT (Ctrl+C) - Initiating graceful shutdown...');
    logInfo('Cleaning up logging state and terminating processes...');
    groupEndAll();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logWarn('Received SIGTERM - Initiating graceful shutdown...');
    logInfo('Cleaning up logging state and terminating processes...');
    groupEndAll();
    process.exit(0);
});

/*
================================================================================
APPLICATION ENTRY POINT
================================================================================
*/

// === MAIN EXECUTION INITIALIZATION ===
// Start the comprehensive multirepo setup orchestration process
main();