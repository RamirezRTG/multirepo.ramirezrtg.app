/**
 * Cache Manager
 * Determines what operations can be skipped based on lock file data
 */
import fs from 'fs';
import path from 'path';
import { LockFileManager } from './lockfile.js';
import { cacheOptions, isDryRun } from '../core/config.js';
import { logInfo, logWarn, logSuccess } from './logger.js';

export class CacheManager {
    constructor() {
        this.lockManager = new LockFileManager();
        this.initialized = false;
    }

    /**
     * Initialize the cache manager
     */
    async initialize() {
        if (this.initialized) {
            return this;
        }

        // Handle --clear-lock option
        if (cacheOptions.clearLock) {
            if (!isDryRun) {
                if (fs.existsSync(this.lockManager.lockFilePath)) {
                    fs.unlinkSync(this.lockManager.lockFilePath);
                    logInfo('Lock file cleared');
                } else {
                    logInfo('No lock file to clear');
                }
            } else {
                logInfo('Would clear lock file (dry-run mode)');
            }
        }

        await this.lockManager.load();
        this.initialized = true;
        return this;
    }

    /**
     * Check if preClone phase can be skipped for a repository
     */
    canSkipPreClone(repo, repoPath) {
        // Always run if cache is disabled or force options are set
        if (this.shouldForceExecution('preClone')) {
            logInfo(`Forcing preClone execution for ${repo.name} (cache override)`);
            return false;
        }

        const repoData = this.lockManager.getRepositoryData(repo.name);
        if (!repoData || repoData.preCloneStatus !== 'success') {
            logInfo(`preClone needed for ${repo.name} (no previous success)`);
            return false;
        }

        // Check if repos.yaml configuration changed
        if (this.lockManager.hasReposYamlChanged()) {
            logInfo(`preClone needed for ${repo.name} (repos.yaml changed)`);
            return false;
        }

        // Check if trait scripts changed
        if (this.lockManager.haveTraitScriptsChanged(repo.traits, 'preClone')) {
            logInfo(`preClone needed for ${repo.name} (trait scripts changed)`);
            return false;
        }

        // Check if custom preClone script changed
        if (this.hasCustomScriptChanged(repo, 'preClone', repoData)) {
            logInfo(`preClone needed for ${repo.name} (custom script changed)`);
            return false;
        }

        logSuccess(`preClone can be skipped for ${repo.name} (no changes detected)`);
        return true;
    }

    /**
     * Check if postClone phase can be skipped for a repository
     */
    canSkipPostClone(repo, repoPath) {
        // Always run if cache is disabled or force options are set
        if (this.shouldForceExecution('postClone')) {
            logInfo(`Forcing postClone execution for ${repo.name} (cache override)`);
            return false;
        }

        const repoData = this.lockManager.getRepositoryData(repo.name);
        if (!repoData || repoData.postCloneStatus !== 'success') {
            logInfo(`postClone needed for ${repo.name} (no previous success)`);
            return false;
        }

        // Check if repository content changed
        if (this.lockManager.hasRepositoryChanged(repo.name, repoPath)) {
            logInfo(`postClone needed for ${repo.name} (repository content changed)`);
            return false;
        }

        // Check if trait scripts changed
        if (this.lockManager.haveTraitScriptsChanged(repo.traits, 'postClone')) {
            logInfo(`postClone needed for ${repo.name} (trait scripts changed)`);
            return false;
        }

        // Check if custom postClone script changed
        if (this.hasCustomScriptChanged(repo, 'postClone', repoData)) {
            logInfo(`postClone needed for ${repo.name} (custom script changed)`);
            return false;
        }

        // Check if dependency files changed
        if (this.haveDependencyFilesChanged(repo, repoPath, repoData)) {
            logInfo(`postClone needed for ${repo.name} (dependency files changed)`);
            return false;
        }

        logSuccess(`postClone can be skipped for ${repo.name} (no changes detected)`);
        return true;
    }

    /**
     * Check if custom hook script has changed
     */
    hasCustomScriptChanged(repo, hookType, repoData) {
        const hookScript = repo[hookType];
        if (!hookScript || !hookScript.endsWith('.js')) {
            return false; // No custom script or it's a command, not a script
        }

        const scriptPath = `scripts/custom/${repo.name}/${hookScript}`;
        if (!fs.existsSync(scriptPath)) {
            return false; // Script doesn't exist
        }

        const currentHash = this.lockManager.calculateFileChecksum(scriptPath);
        const storedHash = repoData.customScripts?.[hookType];

        return currentHash !== storedHash;
    }

    /**
     * Check if dependency files have changed
     */
    haveDependencyFilesChanged(repo, repoPath, repoData) {
        if (!fs.existsSync(repoPath)) {
            return false; // Repository doesn't exist yet
        }

        const dependencyFiles = [
            'package.json',
            'package-lock.json',
            'composer.json',
            'composer.lock',
            'yarn.lock',
            'pnpm-lock.yaml',
            'requirements.txt',
            'Pipfile.lock',
            'Gemfile.lock',
            'go.mod',
            'go.sum'
        ];

        for (const file of dependencyFiles) {
            const filePath = path.join(repoPath, file);
            if (fs.existsSync(filePath)) {
                const currentHash = this.lockManager.calculateFileChecksum(filePath);
                const storedHash = repoData.dependencyFiles?.[file];

                if (currentHash !== storedHash) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Determine if execution should be forced based on cache options
     */
    shouldForceExecution(phase) {
        if (cacheOptions.skipCache) {
            return true; // Skip all caching
        }

        if (cacheOptions.forceAll) {
            return true; // Force everything
        }

        if (phase === 'preClone' && cacheOptions.forcePrecclone) {
            return true;
        }

        if (phase === 'postClone' && cacheOptions.forcePostclone) {
            return true;
        }

        return false;
    }

    /**
     * Update lock file after successful phase execution
     */
    async updateAfterSuccess(repo, repoPath, phase, success = true) {
        if (cacheOptions.skipCache) {
            return; // Don't update if we're skipping cache entirely
        }

        const updateData = {
            traits: repo.traits || []
        };

        if (phase === 'preClone') {
            updateData.preCloneStatus = success ? 'success' : 'failed';
            updateData.preCloneTimestamp = new Date().toISOString();

            // Store custom script checksums
            updateData.customScripts = updateData.customScripts || {};
            if (repo.preClone && repo.preClone.endsWith('.js')) {
                const scriptPath = `scripts/custom/${repo.name}/${repo.preClone}`;
                if (fs.existsSync(scriptPath)) {
                    updateData.customScripts.preClone = this.lockManager.calculateFileChecksum(scriptPath);
                }
            }

        } else if (phase === 'postClone') {
            updateData.postCloneStatus = success ? 'success' : 'failed';
            updateData.postCloneTimestamp = new Date().toISOString();

            // Calculate repository content checksum
            if (fs.existsSync(repoPath)) {
                updateData.contentChecksum = this.lockManager.calculateDirectoryChecksum(repoPath);
            }

            // Update dependency file checksums
            updateData.dependencyFiles = this.calculateDependencyFileChecksums(repoPath);

            // Store custom script checksums
            updateData.customScripts = updateData.customScripts || {};
            if (repo.postClone && repo.postClone.endsWith('.js')) {
                const scriptPath = `scripts/custom/${repo.name}/${repo.postClone}`;
                if (fs.existsSync(scriptPath)) {
                    updateData.customScripts.postClone = this.lockManager.calculateFileChecksum(scriptPath);
                }
            }
        }

        this.lockManager.updateRepositoryData(repo.name, updateData);

        // Update global checksums
        this.updateGlobalChecksums(repo);
    }

    /**
     * Calculate checksums for dependency files
     */
    calculateDependencyFileChecksums(repoPath) {
        if (!fs.existsSync(repoPath)) {
            return {};
        }

        const dependencyFiles = [
            'package.json',
            'package-lock.json',
            'composer.json',
            'composer.lock',
            'yarn.lock',
            'pnpm-lock.yaml',
            'requirements.txt',
            'Pipfile.lock',
            'Gemfile.lock',
            'go.mod',
            'go.sum'
        ];

        const checksums = {};
        for (const file of dependencyFiles) {
            const filePath = path.join(repoPath, file);
            if (fs.existsSync(filePath)) {
                checksums[file] = this.lockManager.calculateFileChecksum(filePath);
            }
        }

        return checksums;
    }

    /**
     * Update global checksums (repos.yaml and trait scripts)
     */
    updateGlobalChecksums(repo) {
        // Update repos.yaml checksum
        const reposYamlHash = this.lockManager.calculateFileChecksum('repos.yaml');
        this.lockManager.updateGlobalChecksums({
            reposYaml: reposYamlHash
        });

        // Update trait script checksums for this repo's traits
        this.lockManager.updateTraitScriptChecksums(repo.traits);
    }

    /**
     * Mark a repository operation as failed
     */
    async updateAfterFailure(repo, repoPath, phase) {
        await this.updateAfterSuccess(repo, repoPath, phase, false);
    }

    /**
     * Save the lock file to disk
     */
    async save() {
        if (cacheOptions.skipCache) {
            logInfo('Skipping lock file save (--skip-cache enabled)');
            return;
        }

        if (isDryRun) {
            logInfo('Would save lock file (dry-run mode)');
            return;
        }

        await this.lockManager.save();
    }

    /**
     * Get cache statistics for reporting
     */
    getCacheStats(repos) {
        const stats = {
            total: repos.length,
            preCloneSkipped: 0,
            postCloneSkipped: 0,
            preCloneForced: 0,
            postCloneForced: 0
        };

        for (const repo of repos) {
            const repoPath = path.join('packages', repo.name);

            if (this.canSkipPreClone(repo, repoPath)) {
                stats.preCloneSkipped++;
            }

            if (this.shouldForceExecution('preClone')) {
                stats.preCloneForced++;
            }

            if (fs.existsSync(repoPath) && this.canSkipPostClone(repo, repoPath)) {
                stats.postCloneSkipped++;
            }

            if (this.shouldForceExecution('postClone')) {
                stats.postCloneForced++;
            }
        }

        return stats;
    }

    /**
     * Display cache information
     */
    displayCacheInfo(repos) {
        if (cacheOptions.skipCache) {
            logWarn('Cache system disabled (--skip-cache)');
            return;
        }

        const stats = this.getCacheStats(repos);
        const lockStats = this.lockManager.getStats();

        logInfo('Cache Information:');
        logInfo(`  Lock file: ${this.lockManager.lockFilePath}`);
        logInfo(`  Repositories tracked: ${lockStats.repositories}`);
        logInfo(`  Trait scripts tracked: ${lockStats.traitScripts}`);
        logInfo(`  Last generated: ${lockStats.lastGenerated || 'Never'}`);

        if (stats.preCloneSkipped > 0 || stats.postCloneSkipped > 0) {
            logInfo('Cache Optimization:');
            if (stats.preCloneSkipped > 0) {
                logInfo(`  PreClone operations can be skipped: ${stats.preCloneSkipped}/${stats.total}`);
            }
            if (stats.postCloneSkipped > 0) {
                logInfo(`  PostClone operations can be skipped: ${stats.postCloneSkipped}/${stats.total}`);
            }
        }

        if (stats.preCloneForced > 0 || stats.postCloneForced > 0) {
            logWarn('Forced Operations:');
            if (stats.preCloneForced > 0) {
                logWarn(`  PreClone operations forced: ${stats.preCloneForced}/${stats.total}`);
            }
            if (stats.postCloneForced > 0) {
                logWarn(`  PostClone operations forced: ${stats.postCloneForced}/${stats.total}`);
            }
        }
    }

    /**
     * Validate that the cache manager is working correctly
     */
    validateCacheIntegrity() {
        return this.lockManager.validateIntegrity();
    }
}