/*
================================================================================
File: scripts/helper/directory-helper.js (Directory Structure Analysis Engine)
Description: Comprehensive directory and file system analysis utility for the
             multirepo setup orchestrator. Provides sophisticated directory
             validation, file pattern matching, and project structure analysis
             to support trait-based repository setup and validation workflows.
             Enables intelligent detection of project types and development
             patterns through filesystem analysis.

Key Responsibilities:
- Directory existence and content validation with detailed reporting
- File pattern matching with regex and string-based filtering
- Project structure validation for common development patterns
- Recursive file system traversal with configurable depth control
- Content analysis for directory population assessment
- Cross-platform file system operation abstraction
- Detailed logging integration for validation feedback

Analysis Capabilities:
- Common project directory detection (src/, test/, docs/, etc.)
- Source code structure validation with expected file patterns
- Build artifact and configuration directory identification
- Nested directory structure analysis and validation
- File count analysis for directory population assessment
- Pattern-based file discovery with flexible matching rules
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for directory and file analysis
import fs from 'fs';
// Path utilities for cross-platform file system navigation
import path from 'path';
// Logging system for validation feedback and status reporting
import { logSuccess, logWarn, logInfo } from './logger.js';
// Terminal styling for enhanced visual feedback
import chalk from 'chalk';

/*
================================================================================
COMPREHENSIVE DIRECTORY ANALYSIS SYSTEM
================================================================================
*/

/**
 * Advanced Directory Helper with Project Structure Intelligence
 *
 * This class implements sophisticated directory and file system analysis
 * capabilities designed to support intelligent repository setup and validation.
 * It provides a comprehensive API for examining project structures, validating
 * directory layouts, and performing pattern-based file discovery.
 *
 * Core Architecture:
 * - Working directory context for consistent path resolution
 * - Cross-platform file system operation abstraction
 * - Flexible pattern matching with multiple matching strategies
 * - Detailed validation reporting with contextual messaging
 * - Recursive traversal capabilities with depth control
 * - Error handling and graceful degradation for inaccessible paths
 *
 * Use Cases:
 * - Project type detection based on directory structures
 * - Trait validation through expected file and folder patterns
 * - Build system identification via directory conventions
 * - Source code organization validation
 * - Documentation and test structure verification
 * - Configuration file location and validation
 */
export class DirectoryHelper {
    /**
     * Initialize directory helper with working directory context
     *
     * Creates a new directory helper instance bound to a specific working
     * directory. All relative path operations will be resolved against this
     * base directory, providing consistent path handling throughout the analysis.
     *
     * @param {string} cwd - Working directory path for all operations
     */
    constructor(cwd) {
        // === WORKING DIRECTORY CONTEXT ===
        this.cwd = path.resolve(cwd); // Resolve to absolute path for consistency

        logInfo(`Directory helper initialized with working directory: ${this.cwd}`);
    }

    /*
    ============================================================================
    BASIC DIRECTORY EXISTENCE AND VALIDATION
    ============================================================================
    */

    /**
     * Check if a directory exists within the working directory context
     *
     * Performs a simple existence check for a directory, handling both
     * the existence test and the directory type validation. Provides
     * the foundation for more complex directory analysis operations.
     *
     * @param {string} name - Directory name relative to working directory
     * @returns {boolean} True if directory exists and is actually a directory
     */
    hasDirectory(name) {
        try {
            const dirPath = path.join(this.cwd, name);

            // === EXISTENCE AND TYPE VALIDATION ===
            return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
        } catch (error) {
            // === ERROR HANDLING ===
            // Handle permission errors or filesystem issues gracefully
            logWarn(`Cannot access directory ${name}: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if directory exists and contains files or subdirectories
     *
     * Performs enhanced directory validation by checking not only for
     * existence but also for content. This is crucial for distinguishing
     * between initialized project directories and empty placeholders.
     *
     * @param {string} name - Directory name relative to working directory
     * @returns {boolean} True if directory exists and has content
     */
    hasNonEmptyDirectory(name) {
        // === EXISTENCE PREREQUISITE ===
        if (!this.hasDirectory(name)) {
            return false;
        }

        try {
            const dirPath = path.join(this.cwd, name);

            // === CONTENT ANALYSIS ===
            const contents = fs.readdirSync(dirPath);
            const hasContent = contents.length > 0;

            if (hasContent) {
                logInfo(`Directory ${chalk.white(name)} contains ${contents.length} items`);
            }

            return hasContent;
        } catch (error) {
            // === ERROR HANDLING ===
            logWarn(`Cannot read directory contents for ${name}: ${error.message}`);
            return false;
        }
    }

    /*
    ============================================================================
    DIRECTORY CONTENT ANALYSIS SYSTEM
    ============================================================================
    */

    /**
     * Retrieve and analyze directory contents with error handling
     *
     * Provides detailed directory content analysis, returning a list of
     * all items within a directory. Includes comprehensive error handling
     * for permission issues and filesystem problems.
     *
     * @param {string} name - Directory name relative to working directory
     * @returns {Array<string>} Array of directory content names, empty if error or missing
     */
    getDirectoryContents(name) {
        // === EXISTENCE PREREQUISITE ===
        if (!this.hasDirectory(name)) {
            logInfo(`Directory ${name} does not exist - returning empty contents`);
            return [];
        }

        try {
            const dirPath = path.join(this.cwd, name);

            // === CONTENT RETRIEVAL ===
            const contents = fs.readdirSync(dirPath);

            logInfo(`Directory ${chalk.white(name)} contains ${contents.length} items: ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? '...' : ''}`);

            return contents;
        } catch (error) {
            // === ERROR HANDLING WITH LOGGING ===
            logWarn(`Could not read directory ${name}: ${error.message}`);
            return [];
        }
    }

    /**
     * Comprehensive directory validation with detailed status reporting
     *
     * Performs thorough directory validation including existence, content
     * analysis, and custom status reporting. Provides flexible messaging
     * for different validation scenarios and outcomes.
     *
     * Validation Process:
     * 1. Check directory existence
     * 2. Analyze directory content
     * 3. Generate appropriate status messages
     * 4. Return validation result for further processing
     *
     * @param {string} name - Directory name to validate
     * @param {string} requiredMessage - Custom message for successful validation
     * @param {string} missingMessage - Custom message for missing directory
     * @param {string} emptyMessage - Custom message for empty directory
     * @returns {boolean} True if directory exists and has content
     */
    checkDirectory(name, requiredMessage = null, missingMessage = null, emptyMessage = null) {
        // === EXISTENCE VALIDATION ===
        if (!this.hasDirectory(name)) {
            const message = missingMessage || `${chalk.white(name)} directory not found.`;
            logWarn(message);
            return false;
        }

        // === CONTENT VALIDATION ===
        const contents = this.getDirectoryContents(name);
        if (contents.length === 0) {
            const message = emptyMessage || `${chalk.white(name)} directory is empty.`;
            logWarn(message);
            return false;
        }

        // === SUCCESS REPORTING ===
        const message = requiredMessage || `${chalk.white(name)} directory found with ${contents.length} items.`;
        logSuccess(message);
        return true;
    }

    /*
    ============================================================================
    FILE PATTERN MATCHING AND DISCOVERY SYSTEM
    ============================================================================
    */

    /**
     * Advanced file discovery with flexible pattern matching and recursive options
     *
     * Implements sophisticated file discovery capabilities supporting multiple
     * pattern matching strategies and configurable traversal depth. Provides
     * the foundation for project structure analysis and trait detection.
     *
     * Pattern Matching Strategies:
     * - String-based substring matching for simple patterns
     * - Regular expression matching for complex patterns
     * - Extension-based filtering for file type analysis
     * - Exact name matching for specific file detection
     *
     * @param {string|RegExp} pattern - Pattern to match against file names
     * @param {boolean} recursive - Whether to search subdirectories recursively
     * @param {string} directory - Specific subdirectory to search (optional)
     * @returns {Array<string>} Array of matching file paths relative to search directory
     */
    findFiles(pattern, recursive = false, directory = '') {
        // === SEARCH DIRECTORY RESOLUTION ===
        const searchDir = directory ? path.join(this.cwd, directory) : this.cwd;

        // === EXISTENCE VALIDATION ===
        if (!fs.existsSync(searchDir)) {
            logInfo(`Search directory does not exist: ${searchDir}`);
            return [];
        }

        try {
            // === RECURSIVE TRAVERSAL CONFIGURATION ===
            const options = recursive ? { recursive: true, withFileTypes: false } : {};

            // === FILE SYSTEM TRAVERSAL ===
            const files = fs.readdirSync(searchDir, options);

            // === PATTERN MATCHING APPLICATION ===
            const matchingFiles = files.filter(file => {
                // Normalize file path for consistent matching across platforms
                const normalizedFile = file.replace(/\\/g, '/');

                if (typeof pattern === 'string') {
                    // === STRING PATTERN MATCHING ===
                    return normalizedFile.includes(pattern);
                } else if (pattern instanceof RegExp) {
                    // === REGULAR EXPRESSION MATCHING ===
                    return pattern.test(normalizedFile);
                } else {
                    // === INVALID PATTERN HANDLING ===
                    logWarn(`Invalid pattern type provided: ${typeof pattern}`);
                    return false;
                }
            });

            if (matchingFiles.length > 0) {
                logInfo(`Found ${matchingFiles.length} files matching pattern in ${directory || 'root'}`);
            }

            return matchingFiles;
        } catch (error) {
            // === ERROR HANDLING ===
            logWarn(`Could not search for files in ${searchDir}: ${error.message}`);
            return [];
        }
    }

    /**
     * Quick existence check for files matching specific patterns
     *
     * Provides a boolean shortcut for determining if any files match
     * a given pattern without needing the full list of matches.
     *
     * @param {string|RegExp} pattern - Pattern to match against file names
     * @param {boolean} recursive - Whether to search subdirectories recursively
     * @param {string} directory - Specific subdirectory to search (optional)
     * @returns {boolean} True if any files match the pattern
     */
    hasFilesMatching(pattern, recursive = false, directory = '') {
        const files = this.findFiles(pattern, recursive, directory);
        const hasMatches = files.length > 0;

        if (hasMatches) {
            logInfo(`Pattern match found: ${files.length} files match in ${directory || 'root'}`);
        }

        return hasMatches;
    }

    /*
    ============================================================================
    PROJECT STRUCTURE VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Batch validation of common project directories with flexible configuration
     *
     * Performs comprehensive validation of multiple directories commonly found
     * in software projects. Supports flexible configuration of requirements
     * and custom messaging for different project types and standards.
     *
     * Common Directory Patterns:
     * - Source code: src/, lib/, app/
     * - Testing: test/, tests/, spec/, __tests__/
     * - Documentation: docs/, doc/, documentation/
     * - Configuration: config/, conf/, settings/
     * - Build artifacts: dist/, build/, target/, out/
     * - Dependencies: node_modules/, vendor/, packages/
     *
     * @param {Array<Object>} directories - Array of directory configuration objects
     * @returns {Object} Results object mapping directory names to existence status
     */
    checkCommonDirectories(directories = []) {
        const results = {};

        logInfo(`Validating ${directories.length} common project directories...`);

        directories.forEach(({ name, required = false, message = null }) => {
            // === INDIVIDUAL DIRECTORY VALIDATION ===
            const exists = this.hasDirectory(name);
            results[name] = exists;

            // === CONTEXTUAL REPORTING ===
            if (exists) {
                const successMessage = message || `${chalk.white(name)} directory found.`;
                logSuccess(successMessage);
            } else if (required) {
                logWarn(`${chalk.white(name)} directory not found but is required for this project type.`);
            } else {
                const infoMessage = message || `${chalk.white(name)} directory not found (optional).`;
                logInfo(infoMessage);
            }
        });

        // === SUMMARY REPORTING ===
        const foundCount = Object.values(results).filter(Boolean).length;
        const requiredCount = directories.filter(d => d.required).length;
        const requiredFoundCount = directories.filter(d => d.required && results[d.name]).length;

        logInfo(`Directory validation summary: ${foundCount}/${directories.length} found, ${requiredFoundCount}/${requiredCount} required directories found`);

        return results;
    }

    /**
     * Comprehensive source directory structure validation with pattern analysis
     *
     * Performs detailed validation of source code directory structures,
     * including analysis of expected file patterns and development conventions.
     * Supports flexible configuration for different project types and languages.
     *
     * Validation Components:
     * - Source directory existence and accessibility
     * - Expected file pattern presence (e.g., *.js, *.ts, *.vue)
     * - Directory structure compliance with conventions
     * - File organization and naming pattern validation
     *
     * @param {string} sourceDir - Name of the source directory to validate
     * @param {Array<Object>} expectedPatterns - Array of file pattern configuration objects
     * @returns {boolean} True if source directory structure is valid
     */
    validateSourceStructure(sourceDir = 'src', expectedPatterns = []) {
        // === SOURCE DIRECTORY VALIDATION ===
        if (!this.hasDirectory(sourceDir)) {
            logWarn(`${chalk.white(sourceDir)} directory not found - cannot validate source structure.`);
            return false;
        }

        logSuccess(`${chalk.white(sourceDir)} directory found - validating structure...`);

        // === PATTERN-BASED VALIDATION ===
        let validationSuccessful = true;

        expectedPatterns.forEach(({ pattern, name, required = false, description = null }) => {
            // === PATTERN MATCHING EXECUTION ===
            const hasFiles = this.hasFilesMatching(pattern, true, sourceDir);

            // === PATTERN VALIDATION REPORTING ===
            if (hasFiles) {
                const successMessage = `${name} files found in ${chalk.white(sourceDir)} directory.`;
                logSuccess(successMessage);
            } else if (required) {
                const errorMessage = `No ${name} files found in ${chalk.white(sourceDir)} directory - required for this project type.`;
                logWarn(errorMessage);
                validationSuccessful = false;
            } else {
                const infoMessage = `No ${name} files found in ${chalk.white(sourceDir)} directory (optional).`;
                logInfo(infoMessage);
            }

            // === ADDITIONAL CONTEXT REPORTING ===
            if (description && hasFiles) {
                logInfo(`  ${description}`);
            }
        });

        // === VALIDATION SUMMARY ===
        if (validationSuccessful) {
            logSuccess(`Source structure validation completed successfully for ${chalk.white(sourceDir)}`);
        } else {
            logWarn(`Source structure validation failed for ${chalk.white(sourceDir)} - missing required components`);
        }

        return validationSuccessful;
    }

    /*
    ============================================================================
    SPECIALIZED DIRECTORY ANALYSIS UTILITIES
    ============================================================================
    */

    /**
     * Nested directory existence validation with path composition
     *
     * Validates the existence of nested directory structures by composing
     * parent and child directory paths. Useful for checking complex
     * directory hierarchies and nested project structures.
     *
     * @param {string} parent - Parent directory name
     * @param {string} child - Child directory name within parent
     * @returns {boolean} True if nested directory structure exists
     */
    hasSubdirectory(parent, child) {
        try {
            const fullPath = path.join(this.cwd, parent, child);
            const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();

            if (exists) {
                logInfo(`Nested directory found: ${parent}/${child}`);
            }

            return exists;
        } catch (error) {
            logWarn(`Cannot check subdirectory ${parent}/${child}: ${error.message}`);
            return false;
        }
    }

    /**
     * File count analysis with optional pattern filtering
     *
     * Provides quantitative analysis of directory contents, with optional
     * pattern-based filtering for specific file types or naming conventions.
     * Useful for project size estimation and structure analysis.
     *
     * @param {string} directory - Directory name to analyze
     * @param {string|RegExp} pattern - Optional pattern to filter files (optional)
     * @returns {number} Count of files matching criteria, 0 if directory missing or error
     */
    getFileCount(directory, pattern = null) {
        // === EXISTENCE VALIDATION ===
        if (!this.hasDirectory(directory)) {
            logInfo(`Directory ${directory} not found - file count is 0`);
            return 0;
        }

        try {
            // === PATTERN-BASED COUNTING ===
            if (pattern) {
                const matchingFiles = this.findFiles(pattern, false, directory);
                const count = matchingFiles.length;

                logInfo(`${count} files match pattern in ${chalk.white(directory)}`);
                return count;
            }

            // === TOTAL FILE COUNTING ===
            const contents = this.getDirectoryContents(directory);
            const count = contents.length;

            logInfo(`${count} total items in ${chalk.white(directory)}`);
            return count;
        } catch (error) {
            logWarn(`Cannot count files in ${directory}: ${error.message}`);
            return 0;
        }
    }

    /*
    ============================================================================
    UTILITY AND INTROSPECTION METHODS
    ============================================================================
    */

    /**
     * Get the current working directory context
     *
     * @returns {string} Absolute path of the working directory
     */
    getWorkingDirectory() {
        return this.cwd;
    }

    /**
     * Create a new directory helper with a different working directory
     *
     * @param {string} newCwd - New working directory path
     * @returns {DirectoryHelper} New DirectoryHelper instance
     */
    withWorkingDirectory(newCwd) {
        return new DirectoryHelper(newCwd);
    }

    /**
     * Check if the working directory itself exists and is accessible
     *
     * @returns {boolean} True if working directory is valid
     */
    isWorkingDirectoryValid() {
        try {
            return fs.existsSync(this.cwd) && fs.statSync(this.cwd).isDirectory();
        } catch (error) {
            logWarn(`Working directory validation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get comprehensive directory statistics for the working directory
     *
     * @returns {Object} Statistics object with directory analysis results
     */
    getDirectoryStats() {
        if (!this.isWorkingDirectoryValid()) {
            return {
                valid: false,
                totalItems: 0,
                directories: 0,
                files: 0
            };
        }

        try {
            const contents = fs.readdirSync(this.cwd);
            let directories = 0;
            let files = 0;

            contents.forEach(item => {
                try {
                    const itemPath = path.join(this.cwd, item);
                    const stat = fs.statSync(itemPath);

                    if (stat.isDirectory()) {
                        directories++;
                    } else if (stat.isFile()) {
                        files++;
                    }
                } catch (error) {
                    // Skip items that can't be accessed
                }
            });

            return {
                valid: true,
                totalItems: contents.length,
                directories,
                files
            };
        } catch (error) {
            logWarn(`Cannot gather directory statistics: ${error.message}`);
            return {
                valid: false,
                totalItems: 0,
                directories: 0,
                files: 0
            };
        }
    }
}