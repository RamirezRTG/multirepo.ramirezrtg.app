/**
 * Configuration management module
 * Handles loading, validation, and system dependency checks
 */
import fs from 'fs';
import path, { dirname } from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { log, logError } from '../helper/logger.js';
import { fileURLToPath } from 'url';

// --- Configuration Constants ---
const __dirname = dirname(fileURLToPath(import.meta.url));
export const isVerbose = process.argv.includes('--verbose');
export const isDryRun = process.argv.includes('--dry-run');

// --- Cache-related options ---
export const cacheOptions = {
    forcePrecclone: process.argv.includes('--force-preclone'),
    forcePostclone: process.argv.includes('--force-postclone'),
    forceAll: process.argv.includes('--force-all'),
    updateLock: process.argv.includes('--update-lock'),
    skipCache: process.argv.includes('--skip-cache'),
    clearLock: process.argv.includes('--clear-lock')
};

// --- Configuration Paths ---
export const packagesDir = path.join(__dirname, '..', '..', 'packages');
export const reposFilePath = path.join(__dirname, '..', '..', 'repos.yaml');
export const customScriptsDir = path.join(__dirname, '..', 'custom');
export const traitScriptsDir = path.join(__dirname, '..', 'traits');

/**
 * Verify that required system dependencies are available
 */
export function checkSystemDependencies() {
    try {
        execSync('git --version', { stdio: 'ignore' });
        log('Git is installed.');
    } catch (error) {
        logError(`'git' command not found. Please install Git and ensure it's in your system's PATH.`);
        process.exit(1);
    }
}

/**
 * Load and parse the repos.yaml configuration file
 * @returns {Promise<Object>} Parsed configuration object
 */
export async function loadConfiguration() {
    try {
        const fileContents = fs.readFileSync(reposFilePath, 'utf8');
        const config = yaml.load(fileContents);
        log(`Successfully parsed '${chalk.white('repos.yaml')}'`);
        return config;
    } catch (error) {
        logError(`Failed to parse '${chalk.white('repos.yaml')}'. Please check for syntax errors.`);
        logError(error.message);
        process.exit(1);
    }
}

/**
 * Validate repository configuration
 * @param {Object} repos - Repository configuration object
 * @returns {Promise<boolean>} True if configuration is valid
 */
export async function validateConfiguration(repos, askQuestion) {
    if (!repos || Object.keys(repos).length === 0) {
        logError(`No repositories configured in '${chalk.white('repos.yaml')}'.`);
        return false;
    }

    const invalidDirNameRegex = /[<>:"/\\|?*]/;
    const gitUrlRegex = /^(https?:\/\/|git@).+\.git$/;

    for (const [name, config] of Object.entries(repos)) {
        if (invalidDirNameRegex.test(name)) {
            logError(`Repository key '${chalk.white(name)}' contains invalid characters for a directory name.`);
            return false;
        }

        if (!config || typeof config.url !== 'string' || !gitUrlRegex.test(config.url)) {
            const answer = await askQuestion(`Repository '${chalk.white(name)}' has no valid URL. Create empty folder instead? (y/N)`, 'y');
            if (answer.toLowerCase() !== 'y' || answer.trim() === '') {
                logError(`Repository '${chalk.white(name)}' is missing a valid 'url' property (must be a valid git URL).`);
                return false;
            }
            config._createEmptyFolder = true;
        }
    }
    return true;
}

// Helper function to validate cache option combinations
export function validateCacheOptions() {
    const errors = [];

    // Check for conflicting options
    if (cacheOptions.skipCache && cacheOptions.updateLock) {
        errors.push('Cannot use --skip-cache and --update-lock together');
    }

    if (cacheOptions.forceAll && (cacheOptions.forcePrecclone || cacheOptions.forcePostclone)) {
        errors.push('--force-all cannot be used with --force-preclone or --force-postclone');
    }

    if (isDryRun && cacheOptions.clearLock) {
        errors.push('Cannot clear lock file in dry-run mode');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

// Helper to determine if any force option is active
export function isForceMode() {
    return cacheOptions.forceAll ||
        cacheOptions.forcePrecclone ||
        cacheOptions.forcePostclone ||
        cacheOptions.skipCache;
}

// Helper to get active cache options as a readable string
export function getActiveCacheOptions() {
    const active = [];

    if (cacheOptions.forceAll) active.push('force-all');
    else {
        if (cacheOptions.forcePrecclone) active.push('force-preclone');
        if (cacheOptions.forcePostclone) active.push('force-postclone');
    }

    if (cacheOptions.skipCache) active.push('skip-cache');
    if (cacheOptions.updateLock) active.push('update-lock');
    if (cacheOptions.clearLock) active.push('clear-lock');

    return active.length > 0 ? active.join(', ') : 'smart caching enabled';
}