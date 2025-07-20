import fs from 'fs';
import path from 'path';
import { logSuccess, logWarn, logInfo } from './logger.js';
import chalk from 'chalk';

export class DirectoryHelper {
    constructor(cwd) {
        this.cwd = cwd;
    }

    /**
     * Check if directory exists
     */
    hasDirectory(name) {
        const dirPath = path.join(this.cwd, name);
        return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    }

    /**
     * Check if directory exists and has content
     */
    hasNonEmptyDirectory(name) {
        if (!this.hasDirectory(name)) {
            return false;
        }

        const dirPath = path.join(this.cwd, name);
        const contents = fs.readdirSync(dirPath);
        return contents.length > 0;
    }

    /**
     * Get directory contents
     */
    getDirectoryContents(name) {
        const dirPath = path.join(this.cwd, name);

        if (!this.hasDirectory(name)) {
            return [];
        }

        try {
            return fs.readdirSync(dirPath);
        } catch (error) {
            logWarn(`Could not read directory ${name}: ${error.message}`);
            return [];
        }
    }

    /**
     * Check directory and log status
     */
    checkDirectory(name, requiredMessage = null, missingMessage = null, emptyMessage = null) {
        if (!this.hasDirectory(name)) {
            if (missingMessage) {
                logWarn(missingMessage);
            } else {
                logWarn(`${chalk.white(name)} directory not found.`);
            }
            return false;
        }

        const contents = this.getDirectoryContents(name);
        if (contents.length === 0) {
            if (emptyMessage) {
                logWarn(emptyMessage);
            } else {
                logWarn(`${chalk.white(name)} directory is empty.`);
            }
            return false;
        }

        if (requiredMessage) {
            logSuccess(requiredMessage);
        } else {
            logSuccess(`${chalk.white(name)} directory found with content.`);
        }
        return true;
    }

    /**
     * Find files matching pattern
     */
    findFiles(pattern, recursive = false, directory = '') {
        const searchDir = directory ? path.join(this.cwd, directory) : this.cwd;

        if (!fs.existsSync(searchDir)) {
            return [];
        }

        try {
            const options = recursive ? { recursive: true } : {};
            const files = fs.readdirSync(searchDir, options);

            return files.filter(file => {
                if (typeof pattern === 'string') {
                    return file.includes(pattern);
                }
                if (pattern instanceof RegExp) {
                    return pattern.test(file);
                }
                return false;
            });
        } catch (error) {
            logWarn(`Could not search for files in ${searchDir}: ${error.message}`);
            return [];
        }
    }

    /**
     * Check for specific file patterns in directory
     */
    hasFilesMatching(pattern, recursive = false, directory = '') {
        const files = this.findFiles(pattern, recursive, directory);
        return files.length > 0;
    }

    /**
     * Check common project directories
     */
    checkCommonDirectories(directories = []) {
        const results = {};

        directories.forEach(({ name, required = false, message = null }) => {
            const exists = this.hasDirectory(name);
            results[name] = exists;

            if (exists) {
                logSuccess(message || `${chalk.white(name)} directory found.`);
            } else if (required) {
                logWarn(`${chalk.white(name)} directory not found but is required.`);
            } else {
                logInfo(message || `${chalk.white(name)} directory not found.`);
            }
        });

        return results;
    }

    /**
     * Validate source directory structure
     */
    validateSourceStructure(sourceDir = 'src', expectedPatterns = []) {
        if (!this.hasDirectory(sourceDir)) {
            logWarn(`${chalk.white(sourceDir)} directory not found.`);
            return false;
        }

        logSuccess(`${chalk.white(sourceDir)} directory found.`);

        expectedPatterns.forEach(({ pattern, name, required = false }) => {
            const hasFiles = this.hasFilesMatching(pattern, true, sourceDir);

            if (hasFiles) {
                logSuccess(`${name} files found in ${chalk.white(sourceDir)} directory.`);
            } else if (required) {
                logWarn(`No ${name} files found in ${chalk.white(sourceDir)} directory.`);
            } else {
                logInfo(`No ${name} files found in ${chalk.white(sourceDir)} directory.`);
            }
        });

        return true;
    }

    /**
     * Check for subdirectory in specific location
     */
    hasSubdirectory(parent, child) {
        const fullPath = path.join(this.cwd, parent, child);
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    }

    /**
     * Get file count in directory
     */
    getFileCount(directory, pattern = null) {
        if (!this.hasDirectory(directory)) {
            return 0;
        }

        if (pattern) {
            return this.findFiles(pattern, false, directory).length;
        }

        return this.getDirectoryContents(directory).length;
    }
}