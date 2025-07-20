/**
 * Lock File Manager
 * Handles multirepo.lock file operations, checksum calculations, and caching logic
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logInfo, logWarn, logError } from './logger.js';

export class LockFileManager {
    constructor(lockFilePath = 'multirepo.lock') {
        this.lockFilePath = lockFilePath;
        this.lockData = null;
        this.excludePatterns = ['.git', 'node_modules', 'vendor', '.idea', '.vscode', 'dist', 'build', 'coverage'];
    }

    /**
     * Load existing lock file or create empty structure
     */
    async load() {
        try {
            if (fs.existsSync(this.lockFilePath)) {
                const content = fs.readFileSync(this.lockFilePath, 'utf8');
                this.lockData = JSON.parse(content);
                logInfo('Lock file loaded successfully');
            } else {
                this.lockData = this.createEmptyLockData();
                logInfo('No existing lock file found, creating new structure');
            }
        } catch (error) {
            logWarn(`Failed to load lock file: ${error.message}. Creating fresh lock data.`);
            this.lockData = this.createEmptyLockData();
        }
        return this.lockData;
    }

    /**
     * Save lock file to disk
     */
    async save() {
        try {
            const content = JSON.stringify(this.lockData, null, 2);
            fs.writeFileSync(this.lockFilePath, content, 'utf8');
            logInfo('Lock file saved successfully');
        } catch (error) {
            logError(`Failed to save lock file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create empty lock data structure
     */
    createEmptyLockData() {
        return {
            version: '1.0.0',
            generated: new Date().toISOString(),
            repositories: {},
            globalChecksums: {
                reposYaml: null,
                traitScripts: {}
            }
        };
    }

    /**
     * Calculate checksum for a file
     */
    calculateFileChecksum(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const content = fs.readFileSync(filePath);
            return crypto.createHash('sha256').update(content).digest('hex');
        } catch (error) {
            logWarn(`Failed to calculate checksum for ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Calculate checksum for a directory (excluding certain patterns)
     */
    calculateDirectoryChecksum(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                return null;
            }

            const files = [];
            this.walkDirectory(dirPath, (filePath, relativePath) => {
                try {
                    const content = fs.readFileSync(filePath);
                    const hash = crypto.createHash('sha256').update(content).digest('hex');
                    files.push(`${relativePath}:${hash}`);
                } catch (error) {
                    // Skip files that can't be read
                    logWarn(`Skipping unreadable file: ${relativePath}`);
                }
            });

            if (files.length === 0) {
                return null; // Empty directory
            }

            files.sort(); // Ensure consistent ordering
            const combinedHash = crypto.createHash('sha256')
                .update(files.join('|'))
                .digest('hex');

            return combinedHash;
        } catch (error) {
            logWarn(`Failed to calculate directory checksum for ${dirPath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Walk directory recursively, excluding certain patterns
     */
    walkDirectory(dirPath, callback) {
        try {
            const entries = fs.readdirSync(dirPath);

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry);
                const relativePath = path.relative(dirPath, fullPath);

                // Skip excluded patterns
                if (this.shouldExclude(entry)) {
                    continue;
                }

                try {
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        this.walkDirectory(fullPath, (subPath, subRelative) => {
                            callback(subPath, path.join(relativePath, path.relative(fullPath, subPath)));
                        });
                    } else if (stat.isFile()) {
                        callback(fullPath, relativePath);
                    }
                } catch (error) {
                    // Skip files/directories that can't be accessed
                    logWarn(`Skipping inaccessible path: ${relativePath}`);
                    continue;
                }
            }
        } catch (error) {
            logWarn(`Failed to walk directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Check if a file/directory should be excluded
     */
    shouldExclude(name) {
        return this.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                // Simple glob pattern support
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(name);
            }
            return name === pattern || name.startsWith(pattern);
        });
    }

    /**
     * Update repository data in lock file
     */
    updateRepositoryData(repoName, data) {
        if (!this.lockData.repositories[repoName]) {
            this.lockData.repositories[repoName] = {
                contentChecksum: null,
                lastProcessed: null,
                traits: [],
                preCloneStatus: null,
                postCloneStatus: null,
                hooks: {
                    preClone: {
                        traitChecksums: {},
                        lastRun: null
                    },
                    postClone: {
                        traitChecksums: {},
                        lastRun: null
                    }
                },
                configChecksum: null,
                dependencyFiles: {}
            };
        }

        // Merge data with existing repository data
        Object.assign(this.lockData.repositories[repoName], data, {
            lastProcessed: new Date().toISOString()
        });
    }

    /**
     * Update global checksums
     */
    updateGlobalChecksums(checksums) {
        Object.assign(this.lockData.globalChecksums, checksums);
        this.lockData.generated = new Date().toISOString();
    }

    /**
     * Get repository data from lock file
     */
    getRepositoryData(repoName) {
        return this.lockData?.repositories?.[repoName] || null;
    }

    /**
     * Check if a repository's content has changed
     */
    hasRepositoryChanged(repoName, repoPath) {
        const lockData = this.getRepositoryData(repoName);
        if (!lockData || !lockData.contentChecksum) {
            return true; // No previous data, assume changed
        }

        const currentChecksum = this.calculateDirectoryChecksum(repoPath);
        return currentChecksum !== lockData.contentChecksum;
    }

    /**
     * Check if trait scripts have changed
     */
    haveTraitScriptsChanged(traits, hookType) {
        if (!traits || traits.length === 0) {
            return false;
        }

        for (const trait of traits) {
            const scriptPath = `scripts/traits/${trait}/${hookType}.js`;
            const scriptKey = `${trait}/${hookType}.js`;

            if (fs.existsSync(scriptPath)) {
                const currentHash = this.calculateFileChecksum(scriptPath);
                const storedHash = this.lockData.globalChecksums.traitScripts[scriptKey];

                if (currentHash !== storedHash) {
                    return true;
                }
            }

            // Also check config.yaml for trait changes
            const configPath = `scripts/traits/${trait}/config.yaml`;
            const configKey = `${trait}/config.yaml`;

            if (fs.existsSync(configPath)) {
                const currentHash = this.calculateFileChecksum(configPath);
                const storedHash = this.lockData.globalChecksums.traitScripts[configKey];

                if (currentHash !== storedHash) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if repos.yaml has changed
     */
    hasReposYamlChanged() {
        const currentHash = this.calculateFileChecksum('repos.yaml');
        return currentHash !== this.lockData.globalChecksums.reposYaml;
    }

    /**
     * Update trait script checksums
     */
    updateTraitScriptChecksums(traits, hookTypes = ['preClone', 'postClone']) {
        if (!traits || traits.length === 0) return;

        for (const trait of traits) {
            for (const hookType of hookTypes) {
                const scriptPath = `scripts/traits/${trait}/${hookType}.js`;
                const scriptKey = `${trait}/${hookType}.js`;

                if (fs.existsSync(scriptPath)) {
                    const hash = this.calculateFileChecksum(scriptPath);
                    this.lockData.globalChecksums.traitScripts[scriptKey] = hash;
                }
            }

            // Also track config.yaml changes
            const configPath = `scripts/traits/${trait}/config.yaml`;
            const configKey = `${trait}/config.yaml`;

            if (fs.existsSync(configPath)) {
                const hash = this.calculateFileChecksum(configPath);
                this.lockData.globalChecksums.traitScripts[configKey] = hash;
            }
        }
    }

    /**
     * Clear repository data (useful for forced refreshes)
     */
    clearRepositoryData(repoName) {
        if (this.lockData.repositories[repoName]) {
            delete this.lockData.repositories[repoName];
        }
    }

    /**
     * Get lock file statistics
     */
    getStats() {
        const repoCount = Object.keys(this.lockData.repositories).length;
        const scriptCount = Object.keys(this.lockData.globalChecksums.traitScripts).length;

        return {
            repositories: repoCount,
            traitScripts: scriptCount,
            lastGenerated: this.lockData.generated,
            version: this.lockData.version
        };
    }

    /**
     * Validate lock file integrity
     */
    validateIntegrity() {
        const errors = [];

        // Check version compatibility
        if (this.lockData.version !== '1.0.0') {
            errors.push(`Unsupported lock file version: ${this.lockData.version}`);
        }

        // Check required fields
        if (!this.lockData.generated) {
            errors.push('Missing generated timestamp');
        }

        if (!this.lockData.repositories || typeof this.lockData.repositories !== 'object') {
            errors.push('Invalid repositories structure');
        }

        if (!this.lockData.globalChecksums || typeof this.lockData.globalChecksums !== 'object') {
            errors.push('Invalid globalChecksums structure');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}