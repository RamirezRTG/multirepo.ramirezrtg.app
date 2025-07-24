
/*
================================================================================
File: scripts/helper/cache-manager.js (Intelligent Cache Management System)
Description: Advanced caching infrastructure for the multirepo setup orchestrator.
             Implements intelligent operation skipping based on comprehensive change
             detection across multiple dimensions including repository content,
             configuration files, custom scripts, and dependency manifests.
             Provides significant performance improvements for large repository
             collections by avoiding redundant operations.

Key Responsibilities:
- Repository state change detection and validation
- Custom script and trait modification tracking
- Dependency file change monitoring (package.json, composer.json, etc.)
- Lock file management for persistent state storage
- Cache optimization statistics and reporting
- Force execution override handling for development workflows
- Integrity validation for cache consistency

Cache Decision Matrix:
- PreClone: Based on repos.yaml, trait scripts, and custom preClone scripts
- PostClone: Based on repository content, dependency files, trait scripts, and custom postClone scripts
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for content analysis and validation
import fs from 'fs';
// Path utilities for cross-platform file access
import path from 'path';
// Lock file management for persistent cache state
import { LockFileManager } from './lockfile.js';
// Configuration flags for cache behavior control
import { cacheOptions, isDryRun } from '../core/config.js';
// Logging system for cache operation feedback
import { logInfo, logWarn, logSuccess } from './logger.js';

/*
================================================================================
INTELLIGENT CACHE MANAGEMENT SYSTEM
================================================================================
*/

/**
 * Advanced Cache Manager with Multi-Dimensional Change Detection
 *
 * This class implements a sophisticated caching system that tracks changes across
 * multiple dimensions to determine when repository operations can be safely skipped.
 * It provides significant performance improvements for repeated setup operations
 * while maintaining correctness through comprehensive change detection.
 *
 * Core Architecture:
 * - Lock file based persistent state storage
 * - Multi-level change detection (config, scripts, content, dependencies)
 * - Force execution overrides for development workflows
 * - Statistical reporting for cache effectiveness analysis
 * - Integrity validation for cache consistency assurance
 *
 * Change Detection Dimensions:
 * 1. Configuration Level: repos.yaml changes affecting repository definitions
 * 2. Script Level: Custom scripts and trait modifications
 * 3. Content Level: Repository file content changes
 * 4. Dependency Level: Package manager file changes (package.json, etc.)
 */
export class CacheManager {
    /**
     * Initialize cache manager with dependency injection
     *
     * Creates a new cache manager instance with integrated lock file management
     * and lazy initialization to avoid unnecessary file system operations.
     */
    constructor() {
        // === DEPENDENCY MANAGEMENT ===
        this.lockManager = new LockFileManager(); // Persistent state storage
        this.initialized = false; // Lazy initialization flag
    }

    /*
    ============================================================================
    INITIALIZATION AND SETUP OPERATIONS
    ============================================================================
    */

    /**
     * Comprehensive initialization with lock file management
     *
     * Performs one-time setup operations including lock file clearing (if requested),
     * lock file loading, and cache state validation. This method is idempotent
     * and can be safely called multiple times.
     *
     * Initialization Sequence:
     * 1. Handle --clear-lock command-line option
     * 2. Load existing lock file data
     * 3. Validate cache integrity
     * 4. Mark initialization as complete
     *
     * @returns {Promise<CacheManager>} Returns this instance for method chaining
     */
    async initialize() {
        if (this.initialized) {
            return this; // Already initialized, skip redundant operations
        }

        // === LOCK FILE CLEARING OPERATION ===
        // Handle explicit user request to clear cache state
        if (cacheOptions.clearLock) {
            await this.handleLockFileClear();
        }

        // === LOCK FILE LOADING ===
        // Load existing cache state from persistent storage
        await this.lockManager.load();

        // === INITIALIZATION COMPLETION ===
        this.initialized = true;
        logInfo('Cache manager initialized successfully');

        return this;
    }

    /**
     * Handle lock file clearing with dry-run support
     *
     * Safely removes the lock file when requested, with appropriate handling
     * for dry-run mode and missing file scenarios.
     */
    async handleLockFileClear() {
        if (!isDryRun) {
            // === ACTUAL LOCK FILE REMOVAL ===
            if (fs.existsSync(this.lockManager.lockFilePath)) {
                fs.unlinkSync(this.lockManager.lockFilePath);
                logInfo('Lock file cleared successfully');
            } else {
                logInfo('No lock file found to clear');
            }
        } else {
            // === DRY-RUN MODE SIMULATION ===
            logInfo('Would clear lock file (dry-run mode)');
        }
    }

    /*
    ============================================================================
    PRE-CLONE PHASE CACHE DECISIONS
    ============================================================================
    */

    /**
     * Determine if preClone phase can be safely skipped for a repository
     *
     * PreClone operations are skipped when no changes have been detected in:
     * - Repository configuration (repos.yaml)
     * - Trait script definitions
     * - Custom preClone scripts
     * - Force execution flags
     *
     * Decision Logic:
     * 1. Check for force execution overrides
     * 2. Validate previous execution success
     * 3. Detect configuration file changes
     * 4. Detect trait script modifications
     * 5. Detect custom script changes
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} repoPath - Full path to repository directory
     * @returns {boolean} True if preClone can be skipped safely
     */
    canSkipPreClone(repo, repoPath) {
        // === FORCE EXECUTION CHECK ===
        // Always execute if user explicitly requested cache bypass
        if (this.shouldForceExecution('preClone')) {
            logInfo(`Forcing preClone execution for ${repo.name} (cache override)`);
            return false;
        }

        // === PREVIOUS SUCCESS VALIDATION ===
        // Cannot skip if no previous successful execution exists
        const repoData = this.lockManager.getRepositoryData(repo.name);
        if (!repoData || repoData.preCloneStatus !== 'success') {
            logInfo(`preClone needed for ${repo.name} (no previous success)`);
            return false;
        }

        // === CONFIGURATION CHANGE DETECTION ===
        // Check if repos.yaml has been modified since last execution
        if (this.lockManager.hasReposYamlChanged()) {
            logInfo(`preClone needed for ${repo.name} (repos.yaml changed)`);
            return false;
        }

        // === TRAIT SCRIPT CHANGE DETECTION ===
        // Check if any trait scripts used by this repository have changed
        if (this.lockManager.haveTraitScriptsChanged(repo.traits, 'preClone')) {
            logInfo(`preClone needed for ${repo.name} (trait scripts changed)`);
            return false;
        }

        // === CUSTOM SCRIPT CHANGE DETECTION ===
        // Check if repository-specific custom preClone script has changed
        if (this.hasCustomScriptChanged(repo, 'preClone', repoData)) {
            logInfo(`preClone needed for ${repo.name} (custom script changed)`);
            return false;
        }

        // === CACHE HIT - OPERATION CAN BE SKIPPED ===
        logSuccess(`preClone can be skipped for ${repo.name} (no changes detected)`);
        return true;
    }

    /*
    ============================================================================
    POST-CLONE PHASE CACHE DECISIONS
    ============================================================================
    */

    /**
     * Determine if postClone phase can be safely skipped for a repository
     *
     * PostClone operations are more complex as they depend on repository content
     * and dependency files. Operations are skipped when no changes detected in:
     * - Repository file content
     * - Dependency manifests (package.json, composer.json, etc.)
     * - Trait script definitions
     * - Custom postClone scripts
     *
     * Decision Logic:
     * 1. Check for force execution overrides
     * 2. Validate previous execution success
     * 3. Detect repository content changes
     * 4. Detect trait script modifications
     * 5. Detect custom script changes
     * 6. Detect dependency file changes
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} repoPath - Full path to repository directory
     * @returns {boolean} True if postClone can be skipped safely
     */
    canSkipPostClone(repo, repoPath) {
        // === FORCE EXECUTION CHECK ===
        // Always execute if user explicitly requested cache bypass
        if (this.shouldForceExecution('postClone')) {
            logInfo(`Forcing postClone execution for ${repo.name} (cache override)`);
            return false;
        }

        // === PREVIOUS SUCCESS VALIDATION ===
        // Cannot skip if no previous successful execution exists
        const repoData = this.lockManager.getRepositoryData(repo.name);
        if (!repoData || repoData.postCloneStatus !== 'success') {
            logInfo(`postClone needed for ${repo.name} (no previous success)`);
            return false;
        }

        // === REPOSITORY CONTENT CHANGE DETECTION ===
        // Check if repository files have been modified since last execution
        if (this.lockManager.hasRepositoryChanged(repo.name, repoPath)) {
            logInfo(`postClone needed for ${repo.name} (repository content changed)`);
            return false;
        }

        // === TRAIT SCRIPT CHANGE DETECTION ===
        // Check if any trait scripts used by this repository have changed
        if (this.lockManager.haveTraitScriptsChanged(repo.traits, 'postClone')) {
            logInfo(`postClone needed for ${repo.name} (trait scripts changed)`);
            return false;
        }

        // === CUSTOM SCRIPT CHANGE DETECTION ===
        // Check if repository-specific custom postClone script has changed
        if (this.hasCustomScriptChanged(repo, 'postClone', repoData)) {
            logInfo(`postClone needed for ${repo.name} (custom script changed)`);
            return false;
        }

        // === DEPENDENCY FILE CHANGE DETECTION ===
        // Check if package manager files have been modified
        if (this.haveDependencyFilesChanged(repo, repoPath, repoData)) {
            logInfo(`postClone needed for ${repo.name} (dependency files changed)`);
            return false;
        }

        // === CACHE HIT - OPERATION CAN BE SKIPPED ===
        logSuccess(`postClone can be skipped for ${repo.name} (no changes detected)`);
        return true;
    }

    /*
    ============================================================================
    CUSTOM SCRIPT CHANGE DETECTION SYSTEM
    ============================================================================
    */

    /**
     * Detect changes in repository-specific custom hook scripts
     *
     * Custom scripts are JavaScript files located in scripts/custom/{repo-name}/
     * that provide repository-specific behavior for preClone or postClone phases.
     * This method compares current script checksums against stored values.
     *
     * Detection Process:
     * 1. Validate script configuration and existence
     * 2. Calculate current script checksum
     * 3. Compare against stored checksum from previous execution
     * 4. Return true if checksums differ or no stored checksum exists
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} hookType - Hook type ('preClone' or 'postClone')
     * @param {Object} repoData - Cached repository data from lock file
     * @returns {boolean} True if custom script has changed
     */
    hasCustomScriptChanged(repo, hookType, repoData) {
        const hookScript = repo[hookType];

        // === SCRIPT CONFIGURATION VALIDATION ===
        // Only JavaScript files are considered custom scripts
        if (!hookScript || !hookScript.endsWith('.js')) {
            return false; // No custom script or it's a command, not a script file
        }

        // === SCRIPT EXISTENCE CHECK ===
        const scriptPath = `scripts/custom/${repo.name}/${hookScript}`;
        if (!fs.existsSync(scriptPath)) {
            return false; // Script file doesn't exist on filesystem
        }

        // === CHECKSUM COMPARISON ===
        // Calculate current checksum and compare with stored value
        const currentHash = this.lockManager.calculateFileChecksum(scriptPath);
        const storedHash = repoData.customScripts?.[hookType];

        const hasChanged = currentHash !== storedHash;

        if (hasChanged) {
            logInfo(`Custom ${hookType} script changed for ${repo.name}: ${scriptPath}`);
        }

        return hasChanged;
    }

    /*
    ============================================================================
    DEPENDENCY FILE CHANGE DETECTION SYSTEM
    ============================================================================
    */

    /**
     * Comprehensive dependency file change detection across multiple package managers
     *
     * Monitors changes in package manager manifest and lock files that could
     * affect the repository setup process. Supports multiple ecosystems and
     * package managers to provide comprehensive coverage.
     *
     * Supported Package Managers:
     * - Node.js: package.json, package-lock.json, yarn.lock, pnpm-lock.yaml
     * - PHP: composer.json, composer.lock
     * - Python: requirements.txt, Pipfile.lock
     * - Ruby: Gemfile.lock
     * - Go: go.mod, go.sum
     *
     * Detection Process:
     * 1. Check repository existence
     * 2. Scan for known dependency files
     * 3. Calculate checksums for existing files
     * 4. Compare against stored checksums
     * 5. Return true if any file has changed
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} repoPath - Full path to repository directory
     * @param {Object} repoData - Cached repository data from lock file
     * @returns {boolean} True if any dependency files have changed
     */
    haveDependencyFilesChanged(repo, repoPath, repoData) {
        // === REPOSITORY EXISTENCE CHECK ===
        if (!fs.existsSync(repoPath)) {
            return false; // Repository doesn't exist yet, no dependency files to check
        }

        // === DEPENDENCY FILE MATRIX ===
        // Comprehensive list of dependency files across multiple ecosystems
        const dependencyFiles = [
            // Node.js ecosystem
            'package.json',
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',

            // PHP ecosystem
            'composer.json',
            'composer.lock',

            // Python ecosystem
            'requirements.txt',
            'Pipfile.lock',

            // Ruby ecosystem
            'Gemfile.lock',

            // Go ecosystem
            'go.mod',
            'go.sum'
        ];

        // === FILE-BY-FILE CHANGE DETECTION ===
        for (const file of dependencyFiles) {
            const filePath = path.join(repoPath, file);

            // Check if file exists in repository
            if (fs.existsSync(filePath)) {
                // Calculate current checksum
                const currentHash = this.lockManager.calculateFileChecksum(filePath);

                // Get stored checksum from cache
                const storedHash = repoData.dependencyFiles?.[file];

                // Compare checksums
                if (currentHash !== storedHash) {
                    logInfo(`Dependency file changed: ${file} in ${repo.name}`);
                    return true; // Change detected, cannot skip
                }
            }
        }

        // === NO CHANGES DETECTED ===
        return false;
    }

    /*
    ============================================================================
    FORCE EXECUTION LOGIC AND OVERRIDE HANDLING
    ============================================================================
    */

    /**
     * Determine if cache should be bypassed based on command-line options
     *
     * Analyzes cache-related command-line flags to determine if operations
     * should be forced to execute regardless of cache state. Provides
     * fine-grained control over cache behavior for development workflows.
     *
     * Force Execution Hierarchy:
     * 1. --skip-cache: Disables all caching
     * 2. --force-all: Forces all phases to execute
     * 3. --force-preclone: Forces only preClone phase
     * 4. --force-postclone: Forces only postClone phase
     *
     * @param {string} phase - Phase being evaluated ('preClone' or 'postClone')
     * @returns {boolean} True if execution should be forced
     */
    shouldForceExecution(phase) {
        // === GLOBAL CACHE DISABLE ===
        if (cacheOptions.skipCache) {
            return true; // Skip all caching mechanisms
        }

        // === FORCE ALL PHASES ===
        if (cacheOptions.forceAll) {
            return true; // Force execution of all phases
        }

        // === PHASE-SPECIFIC FORCE OPTIONS ===
        if (phase === 'preClone' && cacheOptions.forcePrecclone) {
            return true; // Force only preClone phase
        }

        if (phase === 'postClone' && cacheOptions.forcePostclone) {
            return true; // Force only postClone phase
        }

        // === NO FORCE FLAGS ACTIVE ===
        return false;
    }

    /*
    ============================================================================
    CACHE STATE UPDATE AND PERSISTENCE SYSTEM
    ============================================================================
    */

    /**
     * Update cache state after successful phase execution
     *
     * Records the successful completion of a repository phase by updating
     * the lock file with current checksums, timestamps, and execution status.
     * This information is used for future cache decisions.
     *
     * Update Process:
     * 1. Prepare phase-specific update data
     * 2. Calculate and store relevant checksums
     * 3. Update repository data in lock file
     * 4. Update global checksums for shared resources
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} repoPath - Full path to repository directory
     * @param {string} phase - Phase that was executed ('preClone' or 'postClone')
     * @param {boolean} success - Whether the phase executed successfully
     */
    async updateAfterSuccess(repo, repoPath, phase, success = true) {
        // === CACHE DISABLED CHECK ===
        if (cacheOptions.skipCache) {
            return; // Don't update cache if caching is disabled
        }

        // === BASE UPDATE DATA PREPARATION ===
        const updateData = {
            traits: repo.traits || [], // Store trait list for validation
            lastUpdated: new Date().toISOString() // Record update timestamp
        };

        // === PHASE-SPECIFIC DATA COLLECTION ===
        if (phase === 'preClone') {
            await this.updatePreCloneData(repo, updateData, success);
        } else if (phase === 'postClone') {
            await this.updatePostCloneData(repo, repoPath, updateData, success);
        }

        // === LOCK FILE UPDATE ===
        this.lockManager.updateRepositoryData(repo.name, updateData);

        // === GLOBAL CHECKSUM UPDATE ===
        this.updateGlobalChecksums(repo);

        logInfo(`Cache updated for ${repo.name} ${phase} phase`);
    }

    /**
     * Update cache data specific to preClone phase
     *
     * Collects and stores preClone-specific information including execution
     * status, timestamps, and custom script checksums.
     *
     * @param {Object} repo - Repository configuration object
     * @param {Object} updateData - Update data object to modify
     * @param {boolean} success - Whether the phase executed successfully
     */
    async updatePreCloneData(repo, updateData, success) {
        // === EXECUTION STATUS RECORDING ===
        updateData.preCloneStatus = success ? 'success' : 'failed';
        updateData.preCloneTimestamp = new Date().toISOString();

        // === CUSTOM SCRIPT CHECKSUM STORAGE ===
        updateData.customScripts = updateData.customScripts || {};

        if (repo.preClone && repo.preClone.endsWith('.js')) {
            const scriptPath = `scripts/custom/${repo.name}/${repo.preClone}`;
            if (fs.existsSync(scriptPath)) {
                updateData.customScripts.preClone = this.lockManager.calculateFileChecksum(scriptPath);
            }
        }
    }

    /**
     * Update cache data specific to postClone phase
     *
     * Collects and stores postClone-specific information including repository
     * content checksums, dependency file checksums, and custom script checksums.
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} repoPath - Full path to repository directory
     * @param {Object} updateData - Update data object to modify
     * @param {boolean} success - Whether the phase executed successfully
     */
    async updatePostCloneData(repo, repoPath, updateData, success) {
        // === EXECUTION STATUS RECORDING ===
        updateData.postCloneStatus = success ? 'success' : 'failed';
        updateData.postCloneTimestamp = new Date().toISOString();

        // === REPOSITORY CONTENT CHECKSUM ===
        if (fs.existsSync(repoPath)) {
            updateData.contentChecksum = this.lockManager.calculateDirectoryChecksum(repoPath);
        }

        // === DEPENDENCY FILE CHECKSUMS ===
        updateData.dependencyFiles = this.calculateDependencyFileChecksums(repoPath);

        // === CUSTOM SCRIPT CHECKSUM STORAGE ===
        updateData.customScripts = updateData.customScripts || {};

        if (repo.postClone && repo.postClone.endsWith('.js')) {
            const scriptPath = `scripts/custom/${repo.name}/${repo.postClone}`;
            if (fs.existsSync(scriptPath)) {
                updateData.customScripts.postClone = this.lockManager.calculateFileChecksum(scriptPath);
            }
        }
    }

    /*
    ============================================================================
    DEPENDENCY FILE CHECKSUM CALCULATION
    ============================================================================
    */

    /**
     * Calculate checksums for all dependency files in a repository
     *
     * Generates a comprehensive checksum map for all dependency-related files
     * found in the repository. This map is used for future change detection.
     *
     * @param {string} repoPath - Full path to repository directory
     * @returns {Object} Map of filename to checksum for all dependency files
     */
    calculateDependencyFileChecksums(repoPath) {
        // === REPOSITORY EXISTENCE CHECK ===
        if (!fs.existsSync(repoPath)) {
            return {}; // No repository, no dependency files
        }

        // === DEPENDENCY FILE MATRIX ===
        const dependencyFiles = [
            'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            'composer.json', 'composer.lock',
            'requirements.txt', 'Pipfile.lock',
            'Gemfile.lock',
            'go.mod', 'go.sum'
        ];

        // === CHECKSUM CALCULATION ===
        const checksums = {};
        for (const file of dependencyFiles) {
            const filePath = path.join(repoPath, file);
            if (fs.existsSync(filePath)) {
                checksums[file] = this.lockManager.calculateFileChecksum(filePath);
            }
        }

        return checksums;
    }

    /*
    ============================================================================
    GLOBAL CHECKSUM MANAGEMENT
    ============================================================================
    */

    /**
     * Update global checksums for shared resources
     *
     * Updates checksums for resources that affect multiple repositories,
     * such as the main configuration file and trait scripts.
     *
     * @param {Object} repo - Repository configuration object
     */
    updateGlobalChecksums(repo) {
        // === REPOS.YAML CHECKSUM UPDATE ===
        const reposYamlHash = this.lockManager.calculateFileChecksum('repos.yaml');
        this.lockManager.updateGlobalChecksums({
            reposYaml: reposYamlHash
        });

        // === TRAIT SCRIPT CHECKSUM UPDATE ===
        // Update checksums for all trait scripts used by this repository
        this.lockManager.updateTraitScriptChecksums(repo.traits);
    }

    /*
    ============================================================================
    FAILURE HANDLING AND RECOVERY
    ============================================================================
    */

    /**
     * Record failed operation in cache for future decisions
     *
     * Updates the cache to reflect that an operation failed, which prevents
     * the operation from being skipped in future runs until it succeeds.
     *
     * @param {Object} repo - Repository configuration object
     * @param {string} repoPath - Full path to repository directory
     * @param {string} phase - Phase that failed ('preClone' or 'postClone')
     */
    async updateAfterFailure(repo, repoPath, phase) {
        await this.updateAfterSuccess(repo, repoPath, phase, false);
        logWarn(`Cache marked failure for ${repo.name} ${phase} phase`);
    }

    /*
    ============================================================================
    PERSISTENCE AND FILE OPERATIONS
    ============================================================================
    */

    /**
     * Persist cache state to disk with dry-run support
     *
     * Saves the current cache state to the lock file, with appropriate
     * handling for cache-disabled and dry-run modes.
     */
    async save() {
        // === CACHE DISABLED CHECK ===
        if (cacheOptions.skipCache) {
            logInfo('Skipping lock file save (--skip-cache enabled)');
            return;
        }

        // === DRY-RUN MODE CHECK ===
        if (isDryRun) {
            logInfo('Would save lock file (dry-run mode)');
            return;
        }

        // === ACTUAL SAVE OPERATION ===
        await this.lockManager.save();
        logSuccess('Cache state saved to lock file');
    }

    /*
    ============================================================================
    STATISTICS AND REPORTING SYSTEM
    ============================================================================
    */

    /**
     * Generate comprehensive cache statistics for reporting
     *
     * Analyzes the current repository set against cache state to provide
     * detailed statistics about cache effectiveness and operation counts.
     *
     * @param {Array} repos - Array of repository configuration objects
     * @returns {Object} Statistics object with cache effectiveness metrics
     */
    getCacheStats(repos) {
        const stats = {
            total: repos.length,
            preCloneSkipped: 0,
            postCloneSkipped: 0,
            preCloneForced: 0,
            postCloneForced: 0,
            cacheHitRate: 0,
            operationsSaved: 0
        };

        // === REPOSITORY-BY-REPOSITORY ANALYSIS ===
        for (const repo of repos) {
            const repoPath = path.join('packages', repo.name);

            // Count preClone cache hits and forces
            if (this.canSkipPreClone(repo, repoPath)) {
                stats.preCloneSkipped++;
            }
            if (this.shouldForceExecution('preClone')) {
                stats.preCloneForced++;
            }

            // Count postClone cache hits and forces (only for existing repos)
            if (fs.existsSync(repoPath)) {
                if (this.canSkipPostClone(repo, repoPath)) {
                    stats.postCloneSkipped++;
                }
                if (this.shouldForceExecution('postClone')) {
                    stats.postCloneForced++;
                }
            }
        }

        // === DERIVED STATISTICS ===
        const totalPossibleOperations = repos.length * 2; // preClone + postClone for each repo
        stats.operationsSaved = stats.preCloneSkipped + stats.postCloneSkipped;
        stats.cacheHitRate = totalPossibleOperations > 0 ?
            Math.round((stats.operationsSaved / totalPossibleOperations) * 100) : 0;

        return stats;
    }

    /**
     * Display comprehensive cache information and statistics
     *
     * Provides detailed console output about cache state, effectiveness,
     * and current configuration for user awareness.
     *
     * @param {Array} repos - Array of repository configuration objects
     */
    displayCacheInfo(repos) {
        // === CACHE DISABLED CHECK ===
        if (cacheOptions.skipCache) {
            logWarn('Cache system disabled (--skip-cache)');
            return;
        }

        // === BASIC CACHE INFORMATION ===
        const stats = this.getCacheStats(repos);
        const lockStats = this.lockManager.getStats();

        logInfo('Cache System Status:');
        logInfo(`  Lock file location: ${this.lockManager.lockFilePath}`);
        logInfo(`  Repositories tracked: ${lockStats.repositories}`);
        logInfo(`  Trait scripts monitored: ${lockStats.traitScripts}`);
        logInfo(`  Last cache update: ${lockStats.lastGenerated || 'Never'}`);

        // === CACHE EFFECTIVENESS REPORTING ===
        if (stats.operationsSaved > 0) {
            logSuccess('Cache Optimization Active:');
            logSuccess(`  Operations that can be skipped: ${stats.operationsSaved}`);
            logSuccess(`  Cache hit rate: ${stats.cacheHitRate}%`);

            if (stats.preCloneSkipped > 0) {
                logInfo(`  PreClone operations skipped: ${stats.preCloneSkipped}/${stats.total}`);
            }
            if (stats.postCloneSkipped > 0) {
                logInfo(`  PostClone operations skipped: ${stats.postCloneSkipped}/${stats.total}`);
            }
        }

        // === FORCE OVERRIDE REPORTING ===
        if (stats.preCloneForced > 0 || stats.postCloneForced > 0) {
            logWarn('Cache Override Active:');
            if (stats.preCloneForced > 0) {
                logWarn(`  PreClone operations forced: ${stats.preCloneForced}/${stats.total}`);
            }
            if (stats.postCloneForced > 0) {
                logWarn(`  PostClone operations forced: ${stats.postCloneForced}/${stats.total}`);
            }
        }
    }

    /*
    ============================================================================
    INTEGRITY VALIDATION AND HEALTH CHECKS
    ============================================================================
    */

    /**
     * Validate cache integrity and consistency
     *
     * Performs comprehensive validation of the cache system to ensure
     * it's operating correctly and hasn't been corrupted.
     *
     * @returns {boolean} True if cache integrity is valid
     */
    validateCacheIntegrity() {
        const isValid = this.lockManager.validateIntegrity();

        if (isValid) {
            logSuccess('Cache integrity validation passed');
        } else {
            logWarn('Cache integrity validation failed - cache may be corrupted');
        }

        return isValid;
    }
}