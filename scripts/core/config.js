
/*
================================================================================
File: scripts/core/config.js (Configuration Management & System Validation)
Description: Central configuration system for the multirepo setup orchestrator.
             Manages all aspects of configuration loading, validation, and system
             readiness checks. Serves as the foundation for the entire setup process
             by providing validated configuration data and ensuring system requirements
             are met before any repository operations begin.

Key Responsibilities:
- Load and parse repos.yaml configuration file
- Validate repository definitions and URL formats
- Check system dependencies (Git availability)
- Manage command-line argument processing
- Handle cache-related configuration options
- Provide path resolution for project directories
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for configuration file access
import fs from 'fs';
// Path utilities for cross-platform directory resolution
import path, { dirname } from 'path';
// Child process execution for system dependency checks
import { execSync } from 'child_process';
// YAML parser for configuration file processing
import yaml from 'js-yaml';
// Terminal styling for enhanced user feedback
import chalk from 'chalk';
// Logging utilities for consistent output formatting
import { log, logError } from '../helper/logger.js';
// ES module path resolution utilities
import { fileURLToPath } from 'url';

/*
================================================================================
CONFIGURATION CONSTANTS AND GLOBAL STATE
================================================================================
*/

// === ENVIRONMENT SETUP ===
// Resolve current directory for ES modules (replaces __dirname in CommonJS)
const __dirname = dirname(fileURLToPath(import.meta.url));

// === RUNTIME BEHAVIOR FLAGS ===
// Control execution mode based on command-line arguments
export const isVerbose = process.argv.includes('--verbose');  // Enhanced logging output
export const isDryRun = process.argv.includes('--dry-run');   // Simulation mode - no file system changes

// === CACHE CONTROL OPTIONS ===
// Comprehensive cache management configuration derived from command-line arguments
// These options control when cached results should be bypassed or updated
export const cacheOptions = {
    // Force re-execution of pre-clone validation hooks (ignore cached results)
    forcePrecclone: process.argv.includes('--force-preclone'),

    // Force re-execution of post-clone setup hooks (ignore cached results)
    forcePostclone: process.argv.includes('--force-postclone'),

    // Force re-execution of all hooks (complete cache bypass)
    forceAll: process.argv.includes('--force-all'),

    // Update lock file with fresh repository state information
    updateLock: process.argv.includes('--update-lock'),

    // Completely disable cache system (all operations executed fresh)
    skipCache: process.argv.includes('--skip-cache'),

    // Clear existing lock file before execution
    clearLock: process.argv.includes('--clear-lock')
};

// === DIRECTORY STRUCTURE PATHS ===
// Central path configuration for consistent directory access across the application
export const packagesDir = path.join(__dirname, '..', '..', 'packages');      // Repository destination directory
export const reposFilePath = path.join(__dirname, '..', '..', 'repos.yaml');  // Main configuration file
export const customScriptsDir = path.join(__dirname, '..', 'custom');         // User-defined custom scripts
export const traitScriptsDir = path.join(__dirname, '..', 'traits');          // Built-in trait definitions

/*
================================================================================
SYSTEM VALIDATION FUNCTIONS
================================================================================
*/

/**
 * Comprehensive system dependency validation
 *
 * Verifies that all required external tools are available in the system PATH
 * and are functional. This is a critical early check that prevents setup failures
 * midway through the process due to missing dependencies.
 *
 * Current Dependencies Checked:
 * - Git: Required for repository cloning and management operations
 *
 * @throws {Process Exit} Terminates process with exit code 1 if dependencies are missing
 */
export function checkSystemDependencies() {
    try {
        // Attempt to execute git version command to verify Git availability
        // Use stdio: 'ignore' to suppress output since we only care about success/failure
        execSync('git --version', { stdio: 'ignore' });
        log('Git is installed and accessible.');
    } catch (error) {
        // Git command failed - likely not installed or not in PATH
        logError(`'git' command not found. Please install Git and ensure it's in your system's PATH.`);
        logError('Git is required for repository cloning and management operations.');
        process.exit(1);
    }
}

/*
================================================================================
CONFIGURATION LOADING AND PARSING
================================================================================
*/

/**
 * Load and parse the main repos.yaml configuration file
 *
 * Reads the central configuration file that defines all repositories to be managed,
 * parses the YAML content, and returns a structured configuration object. This function
 * serves as the primary entry point for accessing repository definitions.
 *
 * Configuration File Structure Expected:
 * ```yaml
 * repositories:
 *   repo-name:
 *     url: "https://github.com/user/repo.git"
 *     traits: ["node", "docker"]
 * ```
 *
 * @returns {Promise<Object>} Parsed configuration object containing repository definitions
 * @throws {Process Exit} Terminates process if file cannot be read or parsed
 */
export async function loadConfiguration() {
    try {
        // Read configuration file with UTF-8 encoding to handle international characters
        const fileContents = fs.readFileSync(reposFilePath, 'utf8');

        // Parse YAML content into JavaScript objects
        // js-yaml automatically handles type conversion and validation
        const config = yaml.load(fileContents);

        log(`Successfully parsed '${chalk.white('repos.yaml')}' configuration file`);
        return config;

    } catch (error) {
        // Configuration loading failed - could be file not found, permissions, or syntax errors
        logError(`Failed to parse '${chalk.white('repos.yaml')}'. Please check for syntax errors.`);
        logError(`Error details: ${error.message}`);
        logError('Ensure the file exists and contains valid YAML syntax.');
        process.exit(1);
    }
}

/*
================================================================================
CONFIGURATION VALIDATION SYSTEM
================================================================================
*/

/**
 * Comprehensive repository configuration validation with interactive fallbacks
 *
 * Performs thorough validation of all repository definitions to ensure they meet
 * system requirements and can be processed successfully. Includes interactive
 * prompts for handling edge cases like missing URLs.
 *
 * Validation Rules Applied:
 * 1. Repository names must be valid directory names (no special characters)
 * 2. URLs must follow Git URL patterns (https:// or git@)
 * 3. Missing URLs can be handled by creating empty folders (user choice)
 *
 * @param {Object} repos - Repository configuration object from repos.yaml
 * @param {Function} askQuestion - Interactive prompt function for user decisions
 * @returns {Promise<boolean>} True if all configurations are valid or resolved
 */
export async function validateConfiguration(repos, askQuestion) {
    // === BASIC STRUCTURE VALIDATION ===
    if (!repos || Object.keys(repos).length === 0) {
        logError(`No repositories configured in '${chalk.white('repos.yaml')}'.`);
        logError('Please add at least one repository definition to the configuration file.');
        return false;
    }

    // === VALIDATION PATTERN DEFINITIONS ===
    // Directory name validation - exclude characters that are invalid on any major OS
    const invalidDirNameRegex = /[<>:"/\\|?*]/;

    // Git URL validation - supports both HTTPS and SSH formats
    const gitUrlRegex = /^(https?:\/\/|git@).+\.git$/;

    // === REPOSITORY-BY-REPOSITORY VALIDATION ===
    for (const [name, config] of Object.entries(repos)) {
        // Validate repository name as a valid directory name
        if (invalidDirNameRegex.test(name)) {
            logError(`Repository key '${chalk.white(name)}' contains invalid characters for a directory name.`);
            logError('Repository names will be used as directory names and must be filesystem-compatible.');
            return false;
        }

        // Validate repository URL or handle missing URL scenarios
        if (!config || typeof config.url !== 'string' || !gitUrlRegex.test(config.url)) {
            // URL is missing or invalid - offer interactive resolution
            const answer = await askQuestion(
                `Repository '${chalk.white(name)}' has no valid URL. Create empty folder instead? (y/N): `
            );

            // User chose not to create empty folder - configuration is invalid
            if (answer.toLowerCase() !== 'y' && answer.trim() !== '') {
                logError(`Repository '${chalk.white(name)}' is missing a valid 'url' property (must be a valid git URL).`);
                logError('Either provide a valid Git URL or choose to create an empty folder.');
                return false;
            }

            // Mark repository for empty folder creation instead of cloning
            config._createEmptyFolder = true;
        }
    }

    return true;
}

/*
================================================================================
CACHE OPTION VALIDATION AND MANAGEMENT
================================================================================
*/

/**
 * Validate cache-related command-line option combinations
 *
 * Ensures that cache-related command-line arguments don't conflict with each other
 * and that they're used in valid combinations. Prevents user errors that could
 * lead to unexpected behavior during setup execution.
 *
 * Validation Rules:
 * - --skip-cache and --update-lock are mutually exclusive
 * - --force-all supersedes individual force options
 * - --clear-lock cannot be used in dry-run mode
 *
 * @returns {Object} Validation result with success status and error messages
 */
export function validateCacheOptions() {
    const errors = [];

    // === MUTUAL EXCLUSION CHECKS ===
    if (cacheOptions.skipCache && cacheOptions.updateLock) {
        errors.push('Cannot use --skip-cache and --update-lock together');
        errors.push('  --skip-cache disables caching entirely');
        errors.push('  --update-lock requires cache system to be active');
    }

    if (cacheOptions.forceAll && (cacheOptions.forcePrecclone || cacheOptions.forcePostclone)) {
        errors.push('--force-all cannot be used with --force-preclone or --force-postclone');
        errors.push('  --force-all already includes both preclone and postclone forcing');
    }

    // === OPERATIONAL SAFETY CHECKS ===
    if (isDryRun && cacheOptions.clearLock) {
        errors.push('Cannot clear lock file in dry-run mode');
        errors.push('  Dry-run mode should not modify any files on disk');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Determine if any cache-bypassing force mode is currently active
 *
 * Utility function to quickly check if the current execution should bypass
 * cached results. Used by cache management systems to determine behavior.
 *
 * @returns {boolean} True if any force mode is active
 */
export function isForceMode() {
    return cacheOptions.forceAll ||
        cacheOptions.forcePrecclone ||
        cacheOptions.forcePostclone ||
        cacheOptions.skipCache;
}

/**
 * Generate human-readable description of active cache options
 *
 * Creates a user-friendly string describing the current cache configuration
 * for display in logs and user feedback. Helps users understand what
 * cache behavior is currently active.
 *
 * @returns {string} Comma-separated list of active options or default message
 */
export function getActiveCacheOptions() {
    const active = [];

    // === FORCE OPTION DETECTION ===
    if (cacheOptions.forceAll) {
        active.push('force-all');
    } else {
        // Only show individual force options if force-all is not active
        if (cacheOptions.forcePrecclone) active.push('force-preclone');
        if (cacheOptions.forcePostclone) active.push('force-postclone');
    }

    // === OTHER CACHE OPTIONS ===
    if (cacheOptions.skipCache) active.push('skip-cache');
    if (cacheOptions.updateLock) active.push('update-lock');
    if (cacheOptions.clearLock) active.push('clear-lock');

    // Return formatted string or default message
    return active.length > 0 ? active.join(', ') : 'smart caching enabled';
}