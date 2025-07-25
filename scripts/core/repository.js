
/*
================================================================================
File: scripts/core/repository.js (Repository Operations & Git Management)
Description: Core repository handling system for the multirepo setup orchestrator.
             Manages all aspects of repository operations including directory creation,
             git cloning, existing project detection, and conflict resolution.
             Serves as the primary interface between the setup system and actual
             repository management operations.

Key Responsibilities:
- Directory structure creation and validation
- Git repository cloning and configuration
- Existing project detection and smart handling
- User interaction for conflict resolution
- Local project integration with remote repositories
- Project type detection and classification
- Git remote origin management and validation
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for directory and file management
import fs from 'fs';
// Path utilities for cross-platform directory handling
import path from 'path';
// Terminal styling for enhanced user feedback
import chalk from 'chalk';
// Comprehensive logging system with categorized output
import { log, logError, logInfo, logSuccess, logWarn } from '../helper/logger.js';
// Configuration constants for directory paths
import { packagesDir } from './config.js';
import {safePrompt} from "./ui.js";

/*
================================================================================
DIRECTORY MANAGEMENT OPERATIONS
================================================================================
*/

/**
 * Ensure the packages directory exists with proper permissions
 *
 * Creates the main packages directory where all repositories will be stored.
 * This is the foundation directory for the entire multirepo structure and
 * must exist before any repository operations can proceed.
 *
 * Directory Structure Created:
 * ```
 * packages/
 * ├── repo-1/
 * ├── repo-2/
 * └── repo-n/
 * ```
 */
export function ensurePackagesDirectory() {
    if (!fs.existsSync(packagesDir)) {
        logInfo(`Creating '${chalk.white('packages')}' directory...`);
        fs.mkdirSync(packagesDir, { recursive: true });
        logSuccess('Packages directory created successfully');
    } else {
        logInfo(`Directory '${chalk.white('packages')}' already exists and is ready.`);
    }
}

/**
 * Generate standardized repository path for consistent directory structure
 *
 * Creates the full filesystem path for a repository based on its name,
 * ensuring consistent location resolution across the entire application.
 *
 * @param {string} repoName - Repository name from configuration
 * @returns {string} Full filesystem path to the repository directory
 */
export function getRepositoryPath(repoName) {
    return path.join(packagesDir, repoName);
}

/*
================================================================================
EXISTING DIRECTORY CONFLICT RESOLUTION SYSTEM
================================================================================
*/

/**
 * Comprehensive existing directory handler with intelligent conflict resolution
 *
 * This is the core conflict resolution system that handles all scenarios where
 * a target directory already exists. It provides intelligent detection of project
 * types, git repository states, and offers contextual options to the user based
 * on the specific situation encountered.
 *
 * Handling Scenarios:
 * 1. Directory doesn't exist → Proceed with normal operation
 * 2. Empty directory exists → Proceed with normal operation
 * 3. Directory with random files → Simple delete/skip choice
 * 4. Directory with project files → Advanced project integration options
 * 5. Git repository without URL configured → Error with suggestions
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Full path to the target directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped, false if it should proceed
 */
export async function handleExistingDirectory(repo, repoPath, askQuestion) {
    // === INITIAL EXISTENCE CHECK ===
    if (!fs.existsSync(repoPath)) {
        return false; // Directory doesn't exist, proceed with clone/creation
    }

    // === DIRECTORY CONTENT ANALYSIS ===
    const dirContents = fs.readdirSync(repoPath);
    if (dirContents.length === 0) {
        logInfo(`Directory '${chalk.white(repo.name)}' exists but is empty - proceeding with setup.`);
        return false; // Empty directory, proceed with clone/creation
    }

    // === CONFLICT DETECTED - BEGIN RESOLUTION PROCESS ===
    logInfo(`Directory '${chalk.white(repo.name)}' already exists and contains files.`);

    // === PROJECT TYPE DETECTION ===
    const projectIndicators = detectProjectType(repoPath);

    // === GIT REPOSITORY PRECHECK ===
    // Special handling for git repositories without configured URLs
    if (!repo.url) {
        const gitValidationResult = await validateGitRepositoryWithoutUrl(repo, repoPath);
        if (gitValidationResult.shouldThrow) {
            throw new Error(gitValidationResult.errorMessage);
        }
    }

    // === PROJECT-BASED CONFLICT RESOLUTION ===
    if (projectIndicators.length > 0) {
        logInfo(`Detected existing ${projectIndicators.join(', ')} project in '${chalk.white(repo.name)}'.`);
        return await handleExistingProjectConflict(repo, repoPath, askQuestion);
    } else {
        // === NON-PROJECT DIRECTORY HANDLING ===
        return await handleNonProjectDirectoryConflict(repo, repoPath, askQuestion);
    }
}

/**
 * Validate git repositories that exist without URL configuration
 *
 * Handles the special case where a git repository exists locally but no URL
 * is configured in repos.yaml. Attempts to detect the remote origin and
 * provide helpful suggestions to the user.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @returns {Promise<Object>} Validation result with error handling instructions
 */
async function validateGitRepositoryWithoutUrl(repo, repoPath) {
    const gitDir = path.join(repoPath, '.git');

    if (!fs.existsSync(gitDir)) {
        return { shouldThrow: false }; // Not a git repository, continue normal handling
    }

    try {
        // Attempt to detect remote origin URL
        const { execSync } = await import('child_process');
        const remoteUrl = execSync('git remote get-url origin', {
            cwd: repoPath,
            encoding: 'utf8'
        }).trim();

        // Git repository with remote detected - provide helpful guidance
        logError(`Git repository detected but no URL configured in repos.yaml`);
        logInfo(`Detected remote origin: ${chalk.cyan(remoteUrl)}`);
        logInfo(`Please add the following to your repos.yaml:`);
        logInfo(`  ${chalk.white(repo.name)}:`);
        logInfo(`    url: ${chalk.white(remoteUrl)}`);

        return {
            shouldThrow: true,
            errorMessage: `Missing URL configuration for git repository: ${repo.name}`
        };

    } catch (gitError) {
        // Git command failed - repository exists but no remote configured
        logWarn(`Git repository exists but no remote origin found and no URL in repos.yaml`);
        logWarn(`Consider adding a URL to repos.yaml or removing the .git directory`);
        return { shouldThrow: false }; // Continue with normal handling
    }
}

/**
 * Handle conflicts with existing project directories
 *
 * Provides advanced options for handling existing projects, including git
 * initialization, project integration, and selective operations based on
 * whether a URL is configured and git repository state.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function handleExistingProjectConflict(repo, repoPath, askQuestion) {
    // === REPOSITORY STATE ANALYSIS ===
    const hasUrl = !!repo.url;
    const hasGit = fs.existsSync(path.join(repoPath, '.git'));
    let hasRemote = false;
    let currentRemoteUrl = null;

    // Check if git repository has remote origin configured
    if (hasGit) {
        try {
            currentRemoteUrl = execSync('git remote get-url origin', {
                cwd: repoPath,
                encoding: 'utf8'
            }).trim();
            hasRemote = true;
        } catch (error) {
            // No remote configured
            hasRemote = false;
        }
    }

    // === DYNAMIC OPTION GENERATION ===
    // Build context-aware options based on repository and git state
    const options = [];

    // Only show git initialization option if URL is available AND git is not already initialized
    if (hasUrl && !hasGit) {
        options.push('Initialize git repository and set remote origin');
    }

    // Show remote setup option if URL is available, git exists, but no remote is configured
    if (hasUrl && hasGit && !hasRemote) {
        options.push('Add remote origin to existing git repository');
    }

    // Show remote update option if URL is available, git exists, remote exists, but URLs don't match
    if (hasUrl && hasGit && hasRemote && currentRemoteUrl !== repo.url) {
        options.push(`Update remote origin (current: ${currentRemoteUrl})`);
    }

    // Always show the "use as-is" option (remove suffix for cleaner display)
    options.push('Use existing project');

    // Only show delete and re-clone option if URL is available
    if (hasUrl) {
        options.push('Delete and re-clone from repository');
    }

    // Always show skip option
    options.push('Skip this repository');

    // === INTERACTIVE CHOICE PRESENTATION ===
    // Use safePrompt for consistent UI and robust validation
    const { choice } = await safePrompt({
        type: 'list',
        name: 'choice',
        message: 'Choose how to handle this existing project:',
        allowEmpty: false,
        emptyMessage: 'You must select an option to proceed.',
        choices: options.map((option, index) => ({
            name: option,
            value: index
        })),
        default: options.length - 1 // Use last choice as default
    });

    // === CHOICE EXECUTION ===
    return await executeExistingProjectChoice(repo, repoPath, choice, options, askQuestion);

}

/**
 * Handle conflicts with non-project directories
 *
 * Simplified handling for directories that contain files but don't appear
 * to be structured projects. Offers basic delete/skip options.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function handleNonProjectDirectoryConflict(repo, repoPath, askQuestion) {
    logWarn(`Directory '${chalk.white(repo.name)}' contains files but doesn't appear to be a project.`);

    const answer = await askQuestion(`Do you want to delete it and re-clone? (y/N): `);

    if (answer.toLowerCase() === 'y') {
        logInfo(`Deleting existing directory: ${chalk.white(repoPath)}`);
        fs.rmSync(repoPath, { recursive: true, force: true });
        logSuccess('Directory deleted successfully');
        return false; // Proceed with clone
    } else {
        logInfo(`Skipping clone for '${chalk.white(repo.name)}'.`);
        return true; // Skip clone
    }
}

/*
================================================================================
PROJECT CHOICE EXECUTION SYSTEM
================================================================================
*/

/**
 * Execute the user's choice for handling existing projects
 *
 * Implements the specific action chosen by the user, with behavior based on
 * the dynamically generated options and repository state.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {number} choiceIndex - Zero-based index of user's choice
 * @param {Array<string>} options - The dynamically generated options array
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function executeExistingProjectChoice(repo, repoPath, choiceIndex, options, askQuestion) {
    const selectedOption = options[choiceIndex];

    // === OPTION-BASED EXECUTION ===
    if (selectedOption.includes('Initialize git repository')) {
        // Initialize new git repository with remote
        return await initializeGitRepository(repo, repoPath, askQuestion);
    } else if (selectedOption.includes('Add remote origin')) {
        // Add remote to existing git repository
        return await addRemoteToExistingGit(repo, repoPath);
    } else if (selectedOption.includes('Update remote origin')) {
        // Update existing remote URL
        return await updateExistingRemote(repo, repoPath, askQuestion);
    } else if (selectedOption.includes('Use existing project')) {
        // Use existing project as-is
        logSuccess(`Using existing project '${chalk.white(repo.name)}'.`);
        repo._existingProject = true;
        return true; // Skip clone, but continue with setup
    } else if (selectedOption.includes('Delete and re-clone')) {
        // Delete and re-clone from repository
        logInfo(`Deleting existing directory: ${chalk.white(repoPath)}`);
        fs.rmSync(repoPath, { recursive: true, force: true });
        logSuccess('Directory deleted successfully');
        return false; // Proceed with clone
    } else if (selectedOption.includes('Skip this repository')) {
        // Skip repository
        logInfo(`Skipping repository '${chalk.white(repo.name)}'.`);
        return true; // Skip
    } else {
        logWarn('Invalid choice. Skipping repository.');
        return true; // Skip
    }
}

/*
================================================================================
GIT REPOSITORY INITIALIZATION SYSTEM
================================================================================
*/

/**
 * Initialize git repository for existing projects with comprehensive validation
 *
 * Handles git repository initialization for existing projects, including remote
 * origin configuration, URL validation, and optional initial commit creation.
 * Provides intelligent handling of existing git repositories and remote conflicts.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function initializeGitRepository(repo, repoPath, askQuestion) {
    const gitDir = path.join(repoPath, '.git');

    if (fs.existsSync(gitDir)) {
        // === EXISTING GIT REPOSITORY HANDLING ===
        logInfo(`Git repository already exists in '${chalk.white(repo.name)}'.`);
        return await handleExistingGitRepository(repo, repoPath, askQuestion);
    } else {
        // === NEW GIT REPOSITORY INITIALIZATION ===
        return await createNewGitRepository(repo, repoPath, askQuestion);
    }
}

/**
 * Handle existing git repositories with remote validation
 *
 * Validates existing git repositories, checks remote origin configuration,
 * and offers to update mismatched remotes.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function handleExistingGitRepository(repo, repoPath, askQuestion) {
    try {
        const { execSync } = await import('child_process');

        // Check current remote origin configuration
        const currentRemote = execSync('git remote get-url origin', {
            cwd: repoPath,
            encoding: 'utf8'
        }).trim();

        if (currentRemote === repo.url) {
            // Remote origin already correctly configured
            logSuccess(`Remote origin already set to correct URL: ${chalk.cyan(currentRemote)}`);
            repo._existingProject = true;
            return true; // Skip clone, continue with setup
        } else {
            // Remote origin mismatch - offer to update
            logWarn(`Remote origin is set to: ${chalk.yellow(currentRemote)}`);
            logWarn(`Expected: ${chalk.cyan(repo.url)}`);

            const updateRemote = await askQuestion('Update remote origin URL? (y/N): ');
            if (updateRemote.toLowerCase() === 'y') {
                execSync(`git remote set-url origin ${repo.url}`, { cwd: repoPath });
                logSuccess('Remote origin URL updated successfully.');
            }
        }
    } catch (error) {
        // Git command failed - continue with existing repository
        logWarn('Could not check remote origin. Proceeding with existing git repository.');
    }

    repo._existingProject = true;
    return true; // Skip clone, continue with setup
}

/**
 * Create new git repository with full initialization
 *
 * Initializes a new git repository, sets up remote origin, and optionally
 * creates an initial commit with all existing project files.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function createNewGitRepository(repo, repoPath, askQuestion) {
    try {
        const { execSync } = await import('child_process');

        // === GIT REPOSITORY INITIALIZATION ===
        logInfo(`Initializing git repository in '${chalk.white(repo.name)}'...`);
        execSync('git init', { cwd: repoPath, stdio: 'inherit' });

        // === REMOTE ORIGIN CONFIGURATION ===
        logInfo(`Setting remote origin to: ${chalk.cyan(repo.url)}`);
        execSync(`git remote add origin ${repo.url}`, { cwd: repoPath, stdio: 'inherit' });

        logSuccess(`Git repository initialized with remote origin set.`);

        // === OPTIONAL INITIAL COMMIT ===
        const createInitialCommit = await askQuestion('Create initial commit? (Y/n): ');
        if (createInitialCommit.toLowerCase() !== 'n') {
            // Configure git user for the commit (prevents commit failures)
            try {
                execSync('git config user.name "Setup Script"', { cwd: repoPath, stdio: 'ignore' });
                execSync('git config user.email "setup@localhost"', { cwd: repoPath, stdio: 'ignore' });
            } catch (configError) {
                logWarn('Could not configure git user. Using global configuration.');
            }

            // Stage all files and create initial commit
            execSync('git add .', { cwd: repoPath, stdio: 'inherit' });
            execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'inherit' });
            logSuccess('Initial commit created successfully.');
        }

        repo._existingProject = true;
        return true; // Skip clone, continue with setup

    } catch (error) {
        // Git initialization failed - offer fallback options
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

/**
 * Add remote origin to existing git repository
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function addRemoteToExistingGit(repo, repoPath) {
    try {
        execSync(`git remote add origin ${repo.url}`, {
            cwd: repoPath,
            stdio: 'inherit'
        });
        logSuccess(`Remote origin added: ${chalk.white(repo.url)}`);
        repo._existingProject = true;
        return true; // Skip clone, continue with setup
    } catch (error) {
        logError(`Failed to add remote origin: ${error.message}`);
        return true; // Skip clone due to error
    }
}

/**
 * Update existing remote origin URL
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Path to the repository directory
 * @param {Function} askQuestion - Interactive prompt function
 * @returns {Promise<boolean>} True if clone should be skipped
 */
async function updateExistingRemote(repo, repoPath, askQuestion) {
    const confirmUpdate = await askQuestion(`Update remote origin to ${repo.url}? (y/n): `);

    if (confirmUpdate.toLowerCase() === 'y' || confirmUpdate.toLowerCase() === 'yes') {
        try {
            execSync(`git remote set-url origin ${repo.url}`, {
                cwd: repoPath,
                stdio: 'inherit'
            });
            logSuccess(`Remote origin updated: ${chalk.white(repo.url)}`);
            repo._existingProject = true;
            return true; // Skip clone, continue with setup
        } catch (error) {
            logError(`Failed to update remote origin: ${error.message}`);
            return true; // Skip clone due to error
        }
    } else {
        logInfo('Remote origin not updated. Using existing project as-is.');
        repo._existingProject = true;
        return true; // Skip clone, continue with setup
    }
}

/*
================================================================================
PROJECT TYPE DETECTION SYSTEM
================================================================================
*/

/**
 * Comprehensive project type detection based on filesystem analysis
 *
 * Analyzes directory contents to identify project types and development
 * frameworks. This information is used to provide contextual options
 * and appropriate handling for different types of projects.
 *
 * Detection Patterns:
 * - Package managers (npm, composer, maven, etc.)
 * - Framework-specific files (dockerfile, makefile, etc.)
 * - Language-specific indicators
 * - Build system configurations
 *
 * @param {string} repoPath - Path to analyze for project indicators
 * @returns {Array<string>} List of detected project types
 */
function detectProjectType(repoPath) {
    const indicators = [];

    // === PROJECT FILE DETECTION MATRIX ===
    const projectFiles = [
        { file: 'package.json', type: 'Node.js/npm' },
        { file: 'composer.json', type: 'PHP/Composer' },
        { file: 'pom.xml', type: 'Java/Maven' },
        { file: 'build.gradle', type: 'Java/Gradle' },
        { file: 'Cargo.toml', type: 'Rust' },
        { file: 'go.mod', type: 'Go' },
        { file: 'requirements.txt', type: 'Python' },
        { file: 'Pipfile', type: 'Python/Pipenv' },
        { file: 'pyproject.toml', type: 'Python/Poetry' },
        { file: 'Dockerfile', type: 'Docker' },
        { file: 'docker-compose.yml', type: 'Docker Compose' },
        { file: 'Makefile', type: 'Make' },
        { file: 'CMakeLists.txt', type: 'CMake' },
        { file: '.gitignore', type: 'Git project' },
        { file: 'README.md', type: 'Documentation' },
        { file: 'LICENSE', type: 'Licensed project' }
    ];

    // === DIRECTORY-BASED DETECTION ===
    const projectDirectories = [
        { dir: 'src', type: 'Source code' },
        { dir: 'lib', type: 'Library' },
        { dir: 'test', type: 'Test suite' },
        { dir: 'tests', type: 'Test suite' },
        { dir: 'docs', type: 'Documentation' },
        { dir: 'node_modules', type: 'Node.js dependencies' },
        { dir: 'vendor', type: 'PHP dependencies' },
        { dir: '.git', type: 'Git repository' }
    ];

    // === FILE-BASED DETECTION ===
    projectFiles.forEach(({ file, type }) => {
        if (fs.existsSync(path.join(repoPath, file))) {
            indicators.push(type);
        }
    });

    // === DIRECTORY-BASED DETECTION ===
    projectDirectories.forEach(({ dir, type }) => {
        if (fs.existsSync(path.join(repoPath, dir))) {
            // Only add if not already detected by file-based detection
            if (!indicators.includes(type)) {
                indicators.push(type);
            }
        }
    });

    return indicators;
}

/*
================================================================================
REPOSITORY CLONING OPERATIONS
================================================================================
*/

/**
 * Execute repository cloning with comprehensive error handling
 *
 * Performs the actual git clone operation or creates empty folders based on
 * repository configuration. Handles various scenarios including URL-based
 * cloning and empty folder creation for repositories without URLs.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} repoPath - Target path for the repository
 * @returns {Promise<void>} Resolves when cloning is complete
 */
export async function cloneRepository(repo, repoPath) {
    if (repo._createEmptyFolder) {
        // === EMPTY FOLDER CREATION ===
        logInfo(`Creating empty folder for '${chalk.white(repo.name)}'...`);
        fs.mkdirSync(repoPath, { recursive: true });
        logSuccess(`Empty folder created: ${chalk.white(repo.name)}`);
    } else if (repo.url) {
        // === GIT CLONE OPERATION ===
        try {
            const { execSync } = await import('child_process');

            logInfo(`Cloning repository '${chalk.white(repo.name)}'...`);
            logInfo(`Source: ${chalk.cyan(repo.url)}`);

            // Execute git clone with progress output
            execSync(`git clone ${repo.url} ${repoPath}`, {
                stdio: 'inherit',
                cwd: path.dirname(repoPath)
            });

            logSuccess(`Successfully cloned: ${chalk.white(repo.name)}`);

        } catch (error) {
            logError(`Failed to clone repository '${chalk.white(repo.name)}': ${error.message}`);
            throw error;
        }
    } else {
        // === FALLBACK HANDLING ===
        logWarn(`No URL configured for '${chalk.white(repo.name)}', creating empty directory`);
        fs.mkdirSync(repoPath, { recursive: true });
        repo._createEmptyFolder = true;
    }
}