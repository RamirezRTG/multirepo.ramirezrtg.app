
/**
 * Repository operations module
 * Handles cloning, directory management, and repository setup
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { log, logError, logInfo, logSuccess, logWarn } from '../helper/logger.js';
import { packagesDir } from './config.js';

/**
 * Ensure the packages directory exists
 */
export function ensurePackagesDirectory() {
    if (!fs.existsSync(packagesDir)) {
        logInfo(`Creating '${chalk.white('packages')}' directory...`);
        fs.mkdirSync(packagesDir);
    } else {
        logInfo(`Directory '${chalk.white('packages')}' already exists.`);
    }
}

/**
 * Handle existing directory conflicts with enhanced local project support
 */
export async function handleExistingDirectory(repo, repoPath, askQuestion) {
    if (!fs.existsSync(repoPath)) {
        return false; // Directory doesn't exist, proceed with clone/creation
    }

    const dirContents = fs.readdirSync(repoPath);
    if (dirContents.length === 0) {
        return false; // Empty directory, proceed with clone/creation
    }

    // Directory exists and has content - determine the scenario
    logInfo(`Directory '${chalk.white(repo.name)}' already exists and contains files.`);

    // Check if this looks like an existing project
    const projectIndicators = detectProjectType(repoPath);

    if (projectIndicators.length > 0) {
        logInfo(`Detected existing ${projectIndicators.join(', ')} project in '${chalk.white(repo.name)}'.`);

        // Enhanced options for existing projects
        const options = [
            'Use existing project as-is (recommended for local projects)',
            'Delete and re-clone from repository',
            'Skip this repository'
        ];

        if (repo.url) {
            options.unshift('Initialize git repository and set remote origin');
        }

        logInfo('Choose how to handle this existing project:');
        options.forEach((option, index) => {
            logInfo(`  ${chalk.cyan(index + 1)}. ${option}`);
        });

        const choice = await askQuestion(`Enter choice (1-${options.length}): `);
        const choiceIndex = parseInt(choice) - 1;

        if (choiceIndex >= 0 && choiceIndex < options.length) {
            return await handleExistingProjectChoice(repo, repoPath, choiceIndex, askQuestion);
        } else {
            logWarn('Invalid choice. Skipping repository.');
            return true; // Skip
        }
    } else {
        // Fallback to original behavior for non-project directories
        logWarn(`Directory '${chalk.white(repo.name)}' contains files but doesn't appear to be a project.`);
        const answer = await askQuestion(`Do you want to delete it and re-clone? (y/N): `);

        if (answer.toLowerCase() === 'y') {
            logInfo(`Deleting existing directory: ${chalk.white(repoPath)}`);
            fs.rmSync(repoPath, { recursive: true, force: true });
            return false; // Proceed with clone
        } else {
            logInfo(`Skipping clone for '${chalk.white(repo.name)}'.`);
            return true; // Skip clone
        }
    }
}

/**
 * Handle the user's choice for existing projects
 */
async function handleExistingProjectChoice(repo, repoPath, choiceIndex, askQuestion) {
    const hasUrl = !!repo.url;

    switch (choiceIndex) {
        case 0:
            if (hasUrl) {
                // Initialize git and set remote
                return await initializeGitRepository(repo, repoPath, askQuestion);
            } else {
                // Use as-is (this was the first option when no URL)
                logSuccess(`Using existing project '${chalk.white(repo.name)}' as-is.`);
                repo._existingProject = true;
                return true; // Skip clone, but continue with setup
            }

        case 1:
            if (hasUrl) {
                // Use as-is
                logSuccess(`Using existing project '${chalk.white(repo.name)}' as-is.`);
                repo._existingProject = true;
                return true; // Skip clone, but continue with setup
            } else {
                // Delete and re-clone (only available if URL exists)
                logInfo(`Deleting existing directory: ${chalk.white(repoPath)}`);
                fs.rmSync(repoPath, { recursive: true, force: true });
                return false; // Proceed with clone
            }

        case 2:
            if (hasUrl) {
                // Delete and re-clone
                logInfo(`Deleting existing directory: ${chalk.white(repoPath)}`);
                fs.rmSync(repoPath, { recursive: true, force: true });
                return false; // Proceed with clone
            } else {
                // Skip
                logInfo(`Skipping repository '${chalk.white(repo.name)}'.`);
                return true; // Skip
            }

        case 3:
            // Skip (always last option)
            logInfo(`Skipping repository '${chalk.white(repo.name)}'.`);
            return true; // Skip

        default:
            logWarn('Invalid choice. Skipping repository.');
            return true; // Skip
    }
}

/**
 * Initialize git repository for existing project
 */
async function initializeGitRepository(repo, repoPath, askQuestion) {
    const gitDir = path.join(repoPath, '.git');

    if (fs.existsSync(gitDir)) {
        logInfo(`Git repository already exists in '${chalk.white(repo.name)}'.`);

        // Check if remote origin is set
        try {
            const { execSync } = await import('child_process');
            const currentRemote = execSync('git remote get-url origin', {
                cwd: repoPath,
                encoding: 'utf8'
            }).trim();

            if (currentRemote === repo.url) {
                logSuccess(`Remote origin already set to correct URL: ${chalk.cyan(currentRemote)}`);
                repo._existingProject = true;
                return true; // Skip clone, continue with setup
            } else {
                logWarn(`Remote origin is set to: ${chalk.yellow(currentRemote)}`);
                logWarn(`Expected: ${chalk.cyan(repo.url)}`);

                const updateRemote = await askQuestion('Update remote origin URL? (y/N): ');
                if (updateRemote.toLowerCase() === 'y') {
                    execSync(`git remote set-url origin ${repo.url}`, { cwd: repoPath });
                    logSuccess('Remote origin URL updated.');
                }
            }
        } catch (error) {
            logWarn('Could not check remote origin. Proceeding with existing git repository.');
        }

        repo._existingProject = true;
        return true; // Skip clone, continue with setup
    } else {
        // Initialize new git repository
        try {
            const { execSync } = await import('child_process');

            logInfo(`Initializing git repository in '${chalk.white(repo.name)}'...`);
            execSync('git init', { cwd: repoPath, stdio: 'inherit' });

            logInfo(`Setting remote origin to: ${chalk.cyan(repo.url)}`);
            execSync(`git remote add origin ${repo.url}`, { cwd: repoPath, stdio: 'inherit' });

            logSuccess(`Git repository initialized with remote origin set.`);

            const createInitialCommit = await askQuestion('Create initial commit? (Y/n): ');
            if (createInitialCommit.toLowerCase() !== 'n') {
                execSync('git add .', { cwd: repoPath, stdio: 'inherit' });
                execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'inherit' });
                logSuccess('Initial commit created.');
            }

            repo._existingProject = true;
            return true; // Skip clone, continue with setup

        } catch (error) {
            logError(`Failed to initialize git repository: ${error.message}`);
            const continueAnyway = await askQuestion('Continue without git initialization? (y/N): ');
            if (continueAnyway.toLowerCase() === 'y') {
                repo._existingProject = true;
                return true; // Skip clone, continue with setup
            } else {
                return true; // Skip entirely
            }
        }
    }
}

/**
 * Detect project type based on directory contents
 */
function detectProjectType(repoPath) {
    const indicators = [];

    // Check for common project files
    const projectFiles = [
        { file: 'package.json', type: 'Node.js/npm' },
        { file: 'composer.json', type: 'PHP/Composer' },
        { file: 'pom.xml', type: 'Java/Maven' },
        { file: 'build.gradle', type: 'Java/Gradle' },
        { file: 'Cargo.toml', type: 'Rust' },
        { file: 'go.mod', type: 'Go' },
        { file: 'requirements.txt', type: 'Python' },
        { file: 'Pipfile', type: 'Python/Pipenv' },
        { file: 'pyproject.toml', type: 'Python' },
        { file: 'Gemfile', type: 'Ruby' },
        { file: '.csproj', type: '.NET' },
        { file: 'pubspec.yaml', type: 'Dart/Flutter' }
    ];

    projectFiles.forEach(({ file, type }) => {
        if (file.startsWith('.')) {
            // Handle glob patterns like .csproj
            const files = fs.readdirSync(repoPath);
            if (files.some(f => f.endsWith(file))) {
                indicators.push(type);
            }
        } else {
            if (fs.existsSync(path.join(repoPath, file))) {
                indicators.push(type);
            }
        }
    });

    // Check for common source directories
    const sourceDirs = ['src', 'lib', 'app', 'source'];
    const hasSourceDir = sourceDirs.some(dir =>
        fs.existsSync(path.join(repoPath, dir)) &&
        fs.statSync(path.join(repoPath, dir)).isDirectory()
    );

    if (hasSourceDir && indicators.length === 0) {
        indicators.push('Source code');
    }

    return indicators;
}

/**
 * Clone a single repository (enhanced with existing project support)
 */
export async function cloneRepository(repo, repoPath) {
    if (repo._skipClone) {
        return; // Skip if marked during directory handling
    }

    if (repo._existingProject) {
        logInfo(`Using existing project '${chalk.white(repo.name)}'.`);
        return; // Project already exists and user chose to use it
    }

    if (repo._createEmptyFolder) {
        logInfo(`Creating empty folder for '${chalk.white(repo.name)}'...`);
        if (!fs.existsSync(repoPath)) {
            fs.mkdirSync(repoPath, { recursive: true });
        }
    } else if (repo.url) {
        logInfo(`Cloning '${chalk.white(repo.name)}'...`);
        const cloneCommand = `git clone ${repo.url} ${repoPath}`;
        log(`Executing: ${cloneCommand}`);

        try {
            const { spawn } = await import('child_process');
            await new Promise((resolve, reject) => {
                const child = spawn('git', ['clone', repo.url, repoPath], {
                    stdio: 'inherit'
                });
                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Git clone exited with code ${code}`));
                });
            });
        } catch (error) {
            logError(`Failed to clone '${chalk.white(repo.name)}'. Please check the URL and your permissions.`);
            process.exit(1);
        }
    } else {
        logInfo(`Repository '${chalk.white(repo.name)}' does not have a URL configured. Skipping clone.`);
    }
}

/**
 * Get repository path
 */
export function getRepositoryPath(repoName) {
    return path.join(packagesDir, repoName);
}