import fs from 'fs';
import path from 'path';
import { logError, logSuccess, logWarn, logInfo } from './logger.js';
import chalk from 'chalk';

export class ConfigFileHelper {
    constructor(cwd) {
        this.cwd = cwd;
    }

    /**
     * Check if a file exists
     */
    hasFile(filename) {
        return fs.existsSync(path.join(this.cwd, filename));
    }

    /**
     * Require a file to exist (throws error if missing)
     * Enhanced with better error messaging
     */
    requireFile(filename, errorMessage) {
        if (!this.hasFile(filename)) {
            // Enhanced error message that shows both what's missing and why it's needed
            const missingFileMsg = `Required file '${chalk.white(filename)}' not found in '${chalk.cyan(this.cwd)}'`;
            const reasonMsg = errorMessage ? ` - ${errorMessage}` : '';
            const fullErrorMsg = `${missingFileMsg}${reasonMsg}`;

            logError(fullErrorMsg);
            logInfo(`Expected location: ${chalk.gray(path.join(this.cwd, filename))}`);
            process.exit(1);
        }
        logSuccess(`Required file '${chalk.white(filename)}' found.`);
        return path.join(this.cwd, filename);
    }

    /**
     * Check for optional file and log result
     */
    checkOptionalFile(filename, foundMessage = null, missingMessage = null) {
        if (this.hasFile(filename)) {
            logSuccess(foundMessage || `'${chalk.white(filename)}' found.`);
            return true;
        } else {
            if (missingMessage) {
                logInfo(missingMessage);
            }
            return false;
        }
    }

    /**
     * Find first existing config file from array of possibilities
     */
    findConfig(possibleNames) {
        for (const name of possibleNames) {
            if (this.hasFile(name)) {
                return name;
            }
        }
        return null;
    }

    /**
     * Check if any config exists from array
     */
    hasAnyConfig(possibleNames) {
        return possibleNames.some(name => this.hasFile(name));
    }

    /**
     * Require one of several possible config files
     * Enhanced with better error messaging
     */
    requireOneOfConfigs(possibleNames, traitName) {
        const foundConfig = this.findConfig(possibleNames);

        if (!foundConfig) {
            const configList = possibleNames.map(c => chalk.white(c)).join(', ');
            logError(`No ${traitName} configuration file found in '${chalk.cyan(this.cwd)}'`);
            logInfo(`Expected one of: ${configList}`);
            logInfo(`Searched locations:`);
            possibleNames.forEach(name => {
                logInfo(`  ${chalk.gray(path.join(this.cwd, name))}`);
            });
            process.exit(1);
        }

        logSuccess(`${traitName} configuration found: ${chalk.white(foundConfig)}`);
        return foundConfig;
    }

    /**
     * Check for config and suggest if missing
     */
    suggestConfigIfMissing(possibleNames, traitName) {
        const foundConfig = this.findConfig(possibleNames);

        if (foundConfig) {
            logSuccess(`${traitName} configuration found: ${chalk.white(foundConfig)}`);
            return foundConfig;
        } else {
            const configList = possibleNames.map(c => chalk.cyan(c)).join(', ');
            logInfo(`No ${traitName} configuration file found in '${chalk.cyan(this.cwd)}'. Consider adding one of: ${configList}`);
            return null;
        }
    }

    /**
     * Read and parse JSON file
     * Enhanced with better error messaging
     */
    readJsonFile(filename) {
        const filePath = path.join(this.cwd, filename);

        if (!fs.existsSync(filePath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            logWarn(`Could not parse '${chalk.white(filename)}' at '${chalk.gray(filePath)}': ${error.message}`);
            return null;
        }
    }

    /**
     * Validate JSON file
     * Enhanced with better error messaging
     */
    validateJsonFile(filename, errorOnInvalid = true) {
        const filePath = path.join(this.cwd, filename);

        if (!fs.existsSync(filePath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            logSuccess(`'${chalk.white(filename)}' is valid JSON.`);
            return parsed;
        } catch (error) {
            const message = `'${chalk.white(filename)}' contains invalid JSON at '${chalk.gray(filePath)}': ${error.message}`;
            if (errorOnInvalid) {
                logError(message);
                process.exit(1);
            } else {
                logWarn(message);
                return null;
            }
        }
    }

    /**
     * Read text file content
     * Enhanced with better error messaging
     */
    readTextFile(filename) {
        const filePath = path.join(this.cwd, filename);

        if (!fs.existsSync(filePath)) {
            return null;
        }

        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            logWarn(`Could not read '${chalk.white(filename)}' at '${chalk.gray(filePath)}': ${error.message}`);
            return null;
        }
    }

    /**
     * Check .gitignore content
     * Enhanced with better messaging
     */
    validateGitignore(requiredEntries = [], traitName = '') {
        const gitignoreContent = this.readTextFile('.gitignore');
        const gitignorePath = path.join(this.cwd, '.gitignore');

        if (!gitignoreContent) {
            const entriesList = requiredEntries.map(e => chalk.cyan(e)).join(', ');
            logWarn(`${chalk.white('.gitignore')} file not found at '${chalk.gray(gitignorePath)}'. Consider creating one to exclude ${entriesList}.`);
            return false;
        }

        const missingEntries = requiredEntries.filter(entry => !gitignoreContent.includes(entry));

        if (missingEntries.length === 0) {
            const context = traitName ? ` ${traitName}` : '';
            logSuccess(`${chalk.white('.gitignore')} properly excludes${context} artifacts.`);
            return true;
        } else {
            const missingList = missingEntries.map(e => chalk.cyan(e)).join(', ');
            logWarn(`${chalk.white('.gitignore')} at '${chalk.gray(gitignorePath)}' should include: ${missingList}`);
            return false;
        }
    }

    /**
     * Helper method to get full path for a filename
     */
    getFullPath(filename) {
        return path.join(this.cwd, filename);
    }

    /**
     * Helper method to get current working directory
     */
    getCurrentDirectory() {
        return this.cwd;
    }
}