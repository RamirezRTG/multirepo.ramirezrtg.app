
/*
================================================================================
File: scripts/helper/lockfile.js (Persistent State Management & Checksum Engine)
Description: Advanced lock file management system for the multirepo setup orchestrator.
             Implements sophisticated checksum calculation, state persistence, and
             change detection across multiple dimensions including file content,
             directory structures, and configuration changes. Serves as the foundation
             for intelligent caching and incremental setup operations.

Key Responsibilities:
- Persistent state storage and retrieval via JSON lock files
- Multi-level checksum calculation (files, directories, configurations)
- Repository content change detection with exclusion patterns
- Trait script modification tracking across multiple hook types
- Global configuration change monitoring (repos.yaml)
- Lock file integrity validation and version management
- Statistical reporting for cache effectiveness analysis

Checksum Architecture:
- File Checksums: SHA-256 hashes for individual file content
- Directory Checksums: Recursive hashes with intelligent exclusions
- Global Checksums: Configuration and trait script tracking
- Repository Checksums: Content state for change detection
- Dependency Checksums: Package manager file monitoring
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for lock file management and content analysis
import fs from 'fs';
// Path utilities for cross-platform file system navigation
import path from 'path';
// Cryptographic hashing for checksum calculation
import crypto from 'crypto';
// Logging system for operation feedback and debugging
import { logInfo, logWarn, logError } from './logger.js';

/*
================================================================================
COMPREHENSIVE LOCK FILE MANAGEMENT SYSTEM
================================================================================
*/

/**
 * Advanced Lock File Manager with Multi-Dimensional Change Detection
 *
 * This class implements a sophisticated state management system that tracks
 * changes across multiple dimensions to enable intelligent caching and
 * incremental operations. It provides persistent storage of checksums,
 * execution states, and metadata to support efficient multi-repository
 * setup workflows.
 *
 * Core Architecture:
 * - JSON-based persistent storage with structured data organization
 * - SHA-256 checksum calculation for reliable change detection
 * - Recursive directory analysis with intelligent exclusion patterns
 * - Multi-level state tracking (global, repository, and hook-specific)
 * - Version management for lock file format evolution
 * - Integrity validation and error recovery mechanisms
 *
 * State Dimensions Tracked:
 * 1. Repository Content: Full directory tree checksums
 * 2. Configuration Files: repos.yaml and trait configurations
 * 3. Trait Scripts: Hook implementations and dependencies
 * 4. Custom Scripts: Repository-specific customizations
 * 5. Dependency Files: Package manager manifests and lock files
 * 6. Execution Status: Success/failure states for each phase
 */
export class LockFileManager {
    /**
     * Initialize lock file manager with configurable storage location
     *
     * Creates a new lock file manager instance with customizable file location
     * and intelligent exclusion patterns for directory scanning. The exclusion
     * patterns prevent common non-essential directories from affecting checksums.
     *
     * @param {string} lockFilePath - Path to the lock file (default: 'multirepo.lock')
     */
    constructor(lockFilePath = 'multirepo.lock') {
        // === STORAGE CONFIGURATION ===
        this.lockFilePath = lockFilePath;
        this.lockData = null; // Lazy-loaded lock file content

        // === DIRECTORY EXCLUSION PATTERNS ===
        // Common directories that should not affect repository checksums
        this.excludePatterns = [
            '.git',           // Git metadata and history
            'node_modules',   // Node.js dependencies
            'vendor',         // PHP/Composer dependencies
            '.idea',          // JetBrains IDE files
            '.vscode',        // Visual Studio Code settings
            'dist',           // Build output directories
            'build',          // Compilation artifacts
            'coverage',       // Test coverage reports
            '.DS_Store',      // macOS file system metadata
            'Thumbs.db',      // Windows thumbnail cache
            '*.log',          // Log files
            '*.tmp',          // Temporary files
            '.env',           // Environment variable files
            '.cache'          // Cache directories
        ];

        logInfo(`Lock file manager initialized with path: ${this.lockFilePath}`);
    }

    /*
    ============================================================================
    LOCK FILE LOADING AND INITIALIZATION
    ============================================================================
    */

    /**
     * Load existing lock file or initialize empty structure with error recovery
     *
     * Attempts to load an existing lock file from disk, with comprehensive
     * error handling and automatic recovery. If the file doesn't exist or
     * is corrupted, creates a new empty lock structure with proper defaults.
     *
     * Loading Process:
     * 1. Check for lock file existence
     * 2. Read and parse JSON content
     * 3. Validate structure integrity
     * 4. Handle corruption with graceful fallback
     * 5. Initialize empty structure if needed
     *
     * @returns {Promise<Object>} Lock data structure ready for use
     */
    async load() {
        try {
            // === EXISTING LOCK FILE LOADING ===
            if (fs.existsSync(this.lockFilePath)) {
                const content = fs.readFileSync(this.lockFilePath, 'utf8');
                this.lockData = JSON.parse(content);

                // === STRUCTURE VALIDATION ===
                const validation = this.validateIntegrity();
                if (!validation.valid) {
                    logWarn(`Lock file integrity issues detected: ${validation.errors.join(', ')}`);
                    logWarn('Proceeding with existing data but recommend regeneration');
                }

                logInfo(`Lock file loaded successfully: ${Object.keys(this.lockData.repositories).length} repositories tracked`);
            } else {
                // === NEW LOCK FILE INITIALIZATION ===
                this.lockData = this.createEmptyLockData();
                logInfo('No existing lock file found - initialized new lock structure');
            }
        } catch (error) {
            // === ERROR RECOVERY ===
            logWarn(`Failed to load lock file: ${error.message}`);
            logWarn('Creating fresh lock data structure for safe operation');
            this.lockData = this.createEmptyLockData();
        }

        return this.lockData;
    }

    /**
     * Create standardized empty lock data structure
     *
     * Generates a new lock file structure with all required fields and
     * proper default values. This structure serves as the foundation
     * for all lock file operations.
     *
     * @returns {Object} Complete empty lock data structure
     */
    createEmptyLockData() {
        return {
            // === METADATA FIELDS ===
            version: '1.0.0',                    // Lock file format version
            generated: new Date().toISOString(),  // Creation timestamp

            // === REPOSITORY STATE TRACKING ===
            repositories: {},                     // Per-repository state data

            // === GLOBAL STATE TRACKING ===
            globalChecksums: {
                reposYaml: null,                 // Main configuration file checksum
                traitScripts: {}                 // Trait script checksums by path
            }
        };
    }

    /*
    ============================================================================
    LOCK FILE PERSISTENCE AND STORAGE
    ============================================================================
    */

    /**
     * Persist lock file to disk with atomic write operations
     *
     * Saves the current lock data structure to disk using atomic write
     * operations to prevent corruption. Includes comprehensive error
     * handling and validation of the save operation.
     *
     * @returns {Promise<void>} Resolves when save operation completes
     */
    async save() {
        try {
            // === JSON SERIALIZATION ===
            // Format with indentation for human readability and debugging
            const content = JSON.stringify(this.lockData, null, 2);

            // === ATOMIC WRITE OPERATION ===
            // Write to temporary file first, then rename for atomicity
            const tempPath = `${this.lockFilePath}.tmp`;
            fs.writeFileSync(tempPath, content, 'utf8');

            // === ATOMIC RENAME ===
            if (fs.existsSync(this.lockFilePath)) {
                fs.unlinkSync(this.lockFilePath);
            }
            fs.renameSync(tempPath, this.lockFilePath);

            // === UPDATE GENERATION TIMESTAMP ===
            this.lockData.generated = new Date().toISOString();

            logInfo(`Lock file saved successfully: ${this.lockFilePath}`);
        } catch (error) {
            logError(`Critical error saving lock file: ${error.message}`);
            throw new Error(`Lock file save failed: ${error.message}`);
        }
    }

    /*
    ============================================================================
    CHECKSUM CALCULATION ENGINE
    ============================================================================
    */

    /**
     * Calculate SHA-256 checksum for individual files with error handling
     *
     * Computes a cryptographically secure hash of file content for reliable
     * change detection. Handles various error conditions gracefully and
     * provides consistent null return values for missing or unreadable files.
     *
     * @param {string} filePath - Full path to the file to checksum
     * @returns {string|null} SHA-256 hash in hexadecimal format, or null if unavailable
     */
    calculateFileChecksum(filePath) {
        try {
            // === FILE EXISTENCE CHECK ===
            if (!fs.existsSync(filePath)) {
                return null; // File doesn't exist - not an error condition
            }

            // === CONTENT READING AND HASHING ===
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('sha256').update(content).digest('hex');

            return hash;
        } catch (error) {
            // === ERROR HANDLING ===
            // Log warning but don't throw - allows operation to continue
            logWarn(`Failed to calculate checksum for ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Calculate comprehensive directory checksum with intelligent exclusions
     *
     * Computes a single checksum representing the entire state of a directory
     * tree, excluding files and directories that shouldn't affect change
     * detection (like .git, node_modules, etc.). Uses recursive traversal
     * with sorted file processing for consistent results across platforms.
     *
     * Checksum Methodology:
     * 1. Recursively traverse directory tree
     * 2. Apply exclusion patterns to filter irrelevant content
     * 3. Calculate individual file checksums
     * 4. Combine into relative-path:checksum pairs
     * 5. Sort pairs for platform consistency
     * 6. Generate final combined checksum
     *
     * @param {string} dirPath - Full path to the directory to checksum
     * @returns {string|null} Combined directory checksum, or null if empty/unreadable
     */
    calculateDirectoryChecksum(dirPath) {
        try {
            // === DIRECTORY EXISTENCE CHECK ===
            if (!fs.existsSync(dirPath)) {
                return null; // Directory doesn't exist
            }

            // === FILE COLLECTION AND PROCESSING ===
            const files = [];

            this.walkDirectory(dirPath, (filePath, relativePath) => {
                try {
                    // === INDIVIDUAL FILE CHECKSUM ===
                    const content = fs.readFileSync(filePath);
                    const hash = crypto.createHash('sha256').update(content).digest('hex');

                    // === RELATIVE PATH NORMALIZATION ===
                    // Use forward slashes for cross-platform consistency
                    const normalizedPath = relativePath.replace(/\\/g, '/');
                    files.push(`${normalizedPath}:${hash}`);
                } catch (error) {
                    // Skip files that can't be read (permissions, etc.)
                    logWarn(`Skipping unreadable file during checksum: ${relativePath}`);
                }
            });

            // === EMPTY DIRECTORY HANDLING ===
            if (files.length === 0) {
                return null; // Empty directory or no readable files
            }

            // === CONSISTENT ORDERING AND FINAL HASH ===
            files.sort(); // Ensure consistent ordering across platforms
            const combinedContent = files.join('|');
            const finalHash = crypto.createHash('sha256').update(combinedContent).digest('hex');

            return finalHash;
        } catch (error) {
            logWarn(`Failed to calculate directory checksum for ${dirPath}: ${error.message}`);
            return null;
        }
    }

    /*
    ============================================================================
    DIRECTORY TRAVERSAL SYSTEM
    ============================================================================
    */

    /**
     * Recursive directory traversal with intelligent filtering
     *
     * Performs depth-first traversal of directory trees while applying
     * exclusion patterns to skip irrelevant files and directories. Handles
     * various filesystem conditions gracefully and provides consistent
     * relative path calculation.
     *
     * Traversal Features:
     * - Exclusion pattern matching with glob support
     * - Graceful handling of permission errors
     * - Consistent relative path calculation
     * - Symlink handling (follows by default)
     * - Cross-platform path normalization
     *
     * @param {string} dirPath - Directory to traverse
     * @param {Function} callback - Function called for each file: (fullPath, relativePath)
     */
    walkDirectory(dirPath, callback) {
        try {
            const entries = fs.readdirSync(dirPath);

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry);
                const relativePath = path.relative(dirPath, fullPath);

                // === EXCLUSION PATTERN MATCHING ===
                if (this.shouldExclude(entry)) {
                    continue; // Skip excluded files/directories
                }

                try {
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        // === RECURSIVE DIRECTORY PROCESSING ===
                        this.walkDirectory(fullPath, (subPath, subRelative) => {
                            // Combine relative paths properly
                            const combinedRelative = path.join(relativePath, path.relative(fullPath, subPath));
                            callback(subPath, combinedRelative);
                        });
                    } else if (stat.isFile()) {
                        // === FILE PROCESSING ===
                        callback(fullPath, relativePath);
                    }
                } catch (statError) {
                    // Skip files/directories that can't be accessed (permissions, etc.)
                    logWarn(`Skipping inaccessible path during traversal: ${relativePath}`);
                    continue;
                }
            }
        } catch (error) {
            logWarn(`Failed to traverse directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Determine if a file or directory should be excluded from processing
     *
     * Applies exclusion patterns to determine if a given file or directory
     * name should be skipped during traversal. Supports both exact matches
     * and simple glob patterns for flexible filtering.
     *
     * Pattern Matching:
     * - Exact name matches: 'node_modules'
     * - Prefix matches: '.git'
     * - Simple glob patterns: '*.log'
     * - Directory patterns: 'build/'
     *
     * @param {string} name - File or directory name to test
     * @returns {boolean} True if the item should be excluded
     */
    shouldExclude(name) {
        return this.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                // === GLOB PATTERN MATCHING ===
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(name);
            } else {
                // === EXACT AND PREFIX MATCHING ===
                return name === pattern || name.startsWith(pattern);
            }
        });
    }

    /*
    ============================================================================
    REPOSITORY STATE MANAGEMENT
    ============================================================================
    */

    /**
     * Update repository state data with comprehensive structure management
     *
     * Updates or creates repository state entries in the lock file with
     * intelligent merging of new data. Ensures all required fields exist
     * and maintains proper structure for all state tracking needs.
     *
     * State Structure:
     * - Basic metadata (timestamps, traits, status)
     * - Content checksums for change detection
     * - Hook execution tracking (preClone/postClone)
     * - Dependency file monitoring
     * - Custom script tracking
     *
     * @param {string} repoName - Repository identifier
     * @param {Object} data - New state data to merge
     */
    updateRepositoryData(repoName, data) {
        // === REPOSITORY ENTRY INITIALIZATION ===
        if (!this.lockData.repositories[repoName]) {
            this.lockData.repositories[repoName] = {
                // === CONTENT TRACKING ===
                contentChecksum: null,           // Directory tree checksum
                lastProcessed: null,             // Last processing timestamp

                // === CONFIGURATION TRACKING ===
                traits: [],                      // Applied trait list
                configChecksum: null,            // Repository-specific config checksum

                // === EXECUTION STATUS TRACKING ===
                preCloneStatus: null,            // 'success', 'failed', or null
                preCloneTimestamp: null,         // When preClone last executed
                postCloneStatus: null,           // 'success', 'failed', or null
                postCloneTimestamp: null,        // When postClone last executed

                // === DEPENDENCY MONITORING ===
                dependencyFiles: {},             // Package manager file checksums

                // === CUSTOM SCRIPT TRACKING ===
                customScripts: {},               // Custom script checksums by type

                // === LEGACY HOOK TRACKING ===
                hooks: {
                    preClone: {
                        traitChecksums: {},      // Legacy trait checksum tracking
                        lastRun: null            // Legacy execution timestamp
                    },
                    postClone: {
                        traitChecksums: {},      // Legacy trait checksum tracking
                        lastRun: null            // Legacy execution timestamp
                    }
                }
            };
        }

        // === DATA MERGING WITH TIMESTAMP UPDATE ===
        Object.assign(this.lockData.repositories[repoName], data, {
            lastProcessed: new Date().toISOString()
        });

        logInfo(`Repository state updated: ${repoName}`);
    }

    /**
     * Retrieve repository state data with null handling
     *
     * @param {string} repoName - Repository identifier
     * @returns {Object|null} Repository state data or null if not found
     */
    getRepositoryData(repoName) {
        return this.lockData?.repositories?.[repoName] || null;
    }

    /*
    ============================================================================
    GLOBAL STATE MANAGEMENT
    ============================================================================
    */

    /**
     * Update global checksums for shared resources
     *
     * Updates checksums for resources that affect multiple repositories,
     * such as the main configuration file and trait scripts.
     *
     * @param {Object} checksums - Checksum data to merge into global state
     */
    updateGlobalChecksums(checksums) {
        Object.assign(this.lockData.globalChecksums, checksums);
        this.lockData.generated = new Date().toISOString();

        logInfo('Global checksums updated');
    }

    /*
    ============================================================================
    CHANGE DETECTION SYSTEM
    ============================================================================
    */

    /**
     * Detect repository content changes via checksum comparison
     *
     * Compares current repository directory checksum against stored value
     * to determine if any files have been modified, added, or removed.
     *
     * @param {string} repoName - Repository identifier
     * @param {string} repoPath - Full path to repository directory
     * @returns {boolean} True if repository content has changed
     */
    hasRepositoryChanged(repoName, repoPath) {
        const lockData = this.getRepositoryData(repoName);

        // === NO PREVIOUS DATA CHECK ===
        if (!lockData || !lockData.contentChecksum) {
            logInfo(`No previous checksum for ${repoName} - treating as changed`);
            return true; // No previous data, assume changed
        }

        // === CHECKSUM COMPARISON ===
        const currentChecksum = this.calculateDirectoryChecksum(repoPath);
        const hasChanged = currentChecksum !== lockData.contentChecksum;

        if (hasChanged) {
            logInfo(`Repository content changed detected: ${repoName}`);
        }

        return hasChanged;
    }

    /**
     * Detect trait script modifications across multiple traits and hook types
     *
     * Checks for changes in trait scripts and configuration files that could
     * affect repository setup behavior. Handles both script files and
     * configuration changes comprehensively.
     *
     * @param {Array<string>} traits - Array of trait names to check
     * @param {string} hookType - Hook type to check ('preClone' or 'postClone')
     * @returns {boolean} True if any trait scripts have changed
     */
    haveTraitScriptsChanged(traits, hookType) {
        // === EMPTY TRAITS HANDLING ===
        if (!traits || traits.length === 0) {
            return false; // No traits to check
        }

        // === TRAIT-BY-TRAIT CHECKING ===
        for (const trait of traits) {
            // === SCRIPT FILE CHECKING ===
            const scriptPath = `scripts/traits/${trait}/${hookType}.js`;
            const scriptKey = `${trait}/${hookType}.js`;

            if (fs.existsSync(scriptPath)) {
                const currentHash = this.calculateFileChecksum(scriptPath);
                const storedHash = this.lockData.globalChecksums.traitScripts[scriptKey];

                if (currentHash !== storedHash) {
                    logInfo(`Trait script changed: ${scriptKey}`);
                    return true;
                }
            }

            // === CONFIGURATION FILE CHECKING ===
            const configPath = `scripts/traits/${trait}/config.yaml`;
            const configKey = `${trait}/config.yaml`;

            if (fs.existsSync(configPath)) {
                const currentHash = this.calculateFileChecksum(configPath);
                const storedHash = this.lockData.globalChecksums.traitScripts[configKey];

                if (currentHash !== storedHash) {
                    logInfo(`Trait configuration changed: ${configKey}`);
                    return true;
                }
            }
        }

        // === NO CHANGES DETECTED ===
        return false;
    }

    /**
     * Detect main configuration file changes
     *
     * @returns {boolean} True if repos.yaml has been modified
     */
    hasReposYamlChanged() {
        const currentHash = this.calculateFileChecksum('repos.yaml');
        const hasChanged = currentHash !== this.lockData.globalChecksums.reposYaml;

        if (hasChanged) {
            logInfo('Main configuration file (repos.yaml) has changed');
        }

        return hasChanged;
    }

    /*
    ============================================================================
    TRAIT SCRIPT CHECKSUM MANAGEMENT
    ============================================================================
    */

    /**
     * Update trait script checksums for multiple traits and hook types
     *
     * Calculates and stores checksums for all trait scripts and configuration
     * files associated with the specified traits. Supports both preClone and
     * postClone hook types with comprehensive file tracking.
     *
     * @param {Array<string>} traits - Array of trait names to update
     * @param {Array<string>} hookTypes - Array of hook types to process
     */
    updateTraitScriptChecksums(traits, hookTypes = ['preClone', 'postClone']) {
        if (!traits || traits.length === 0) return;

        // === TRAIT-BY-TRAIT PROCESSING ===
        for (const trait of traits) {
            // === HOOK SCRIPT PROCESSING ===
            for (const hookType of hookTypes) {
                const scriptPath = `scripts/traits/${trait}/${hookType}.js`;
                const scriptKey = `${trait}/${hookType}.js`;

                if (fs.existsSync(scriptPath)) {
                    const hash = this.calculateFileChecksum(scriptPath);
                    this.lockData.globalChecksums.traitScripts[scriptKey] = hash;
                }
            }

            // === CONFIGURATION FILE PROCESSING ===
            const configPath = `scripts/traits/${trait}/config.yaml`;
            const configKey = `${trait}/config.yaml`;

            if (fs.existsSync(configPath)) {
                const hash = this.calculateFileChecksum(configPath);
                this.lockData.globalChecksums.traitScripts[configKey] = hash;
            }
        }

        logInfo(`Updated trait script checksums for ${traits.length} traits`);
    }

    /*
    ============================================================================
    UTILITY AND MAINTENANCE OPERATIONS
    ============================================================================
    */

    /**
     * Clear all state data for a specific repository
     *
     * Removes all cached state information for a repository, forcing
     * fresh processing on the next run. Useful for troubleshooting
     * and forced refreshes.
     *
     * @param {string} repoName - Repository identifier to clear
     */
    clearRepositoryData(repoName) {
        if (this.lockData.repositories[repoName]) {
            delete this.lockData.repositories[repoName];
            logInfo(`Cleared all cached data for repository: ${repoName}`);
        }
    }

    /**
     * Generate comprehensive lock file statistics
     *
     * Provides detailed statistics about the current lock file state
     * for reporting and debugging purposes.
     *
     * @returns {Object} Statistics object with counts and metadata
     */
    getStats() {
        const repoCount = Object.keys(this.lockData.repositories).length;
        const scriptCount = Object.keys(this.lockData.globalChecksums.traitScripts).length;

        return {
            repositories: repoCount,
            traitScripts: scriptCount,
            lastGenerated: this.lockData.generated,
            version: this.lockData.version,
            fileSize: fs.existsSync(this.lockFilePath) ? fs.statSync(this.lockFilePath).size : 0
        };
    }

    /**
     * Comprehensive lock file integrity validation
     *
     * Performs thorough validation of the lock file structure to ensure
     * it contains all required fields and has valid data types. Used
     * during loading to detect corruption or version incompatibilities.
     *
     * Validation Checks:
     * - Version compatibility
     * - Required field presence
     * - Data type correctness
     * - Structure consistency
     *
     * @returns {Object} Validation result with success status and error details
     */
    validateIntegrity() {
        const errors = [];

        // === VERSION COMPATIBILITY CHECK ===
        if (this.lockData.version !== '1.0.0') {
            errors.push(`Unsupported lock file version: ${this.lockData.version}`);
        }

        // === REQUIRED FIELD VALIDATION ===
        if (!this.lockData.generated) {
            errors.push('Missing generated timestamp');
        }

        if (!this.lockData.repositories || typeof this.lockData.repositories !== 'object') {
            errors.push('Invalid repositories structure');
        }

        if (!this.lockData.globalChecksums || typeof this.lockData.globalChecksums !== 'object') {
            errors.push('Invalid globalChecksums structure');
        }

        // === STRUCTURAL VALIDATION ===
        if (this.lockData.globalChecksums && typeof this.lockData.globalChecksums.traitScripts !== 'object') {
            errors.push('Invalid traitScripts structure in globalChecksums');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}