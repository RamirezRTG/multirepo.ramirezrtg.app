
/*
================================================================================
File: scripts/helper/config-file-helper.js (Configuration File Management System)
Description: Comprehensive configuration file detection, validation, and analysis
             utility for the multirepo setup orchestrator. Provides sophisticated
             file system operations for configuration file management, JSON parsing
             with error recovery, and project configuration validation across
             multiple file formats and naming conventions.

Key Responsibilities:
- Configuration file existence detection with flexible naming patterns
- JSON file parsing and validation with comprehensive error handling
- Multi-format configuration file discovery (JSON, YAML, JS, etc.)
- Required vs optional file validation with descriptive error messaging
- Git ignore file analysis and validation for proper artifact exclusion
- Cross-platform file path resolution and normalization
- Text file content analysis for configuration validation

Configuration Management Features:
- Flexible file discovery with multiple naming convention support
- Graceful error handling with detailed diagnostic information
- Contextual logging with enhanced visual feedback
- Support for trait-specific configuration requirements
- Batch configuration validation across multiple file types
- Content-based validation for configuration correctness
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for configuration file access and validation
import fs from 'fs';
// Path utilities for cross-platform file system navigation
import path from 'path';
// Comprehensive logging system for validation feedback
import { logError, logSuccess, logWarn, logInfo } from './logger.js';
// Terminal styling for enhanced visual feedback
import chalk from 'chalk';

/*
================================================================================
COMPREHENSIVE CONFIGURATION FILE MANAGEMENT SYSTEM
================================================================================
*/

/**
 * Advanced Configuration File Helper with Multi-Format Support
 *
 * This class implements sophisticated configuration file management capabilities
 * designed to support complex project setup and validation workflows. It provides
 * comprehensive file detection, validation, and analysis features that adapt to
 * different project types and configuration conventions.
 *
 * Core Capabilities:
 * - Multi-format configuration file detection (JSON, YAML, JS, etc.)
 * - Flexible naming convention support for different tools and frameworks
 * - Comprehensive error handling with detailed diagnostic information
 * - Content validation for configuration correctness and completeness
 * - Git ignore file analysis for proper artifact exclusion
 * - Cross-platform path resolution and file access abstraction
 *
 * Supported Configuration Patterns:
 * - Standard configuration files (.eslintrc, tsconfig.json, etc.)
 * - Multiple naming conventions (dotfiles, config directories, etc.)
 * - Format variations (JSON, YAML, JavaScript modules, etc.)
 * - Tool-specific configuration requirements
 * - Project structure validation requirements
 *
 * Use Cases:
 * - Trait-based project validation
 * - Development tool configuration verification
 * - Build system setup validation
 * - Project structure compliance checking
 * - Configuration file discovery and analysis
 */
export class ConfigFileHelper {
    /**
     * Initialize configuration file helper with working directory context
     *
     * Creates a new configuration file helper instance bound to a specific
     * working directory. All file operations will be resolved relative to
     * this base directory, ensuring consistent path handling across operations.
     *
     * @param {string} cwd - Working directory path for all file operations
     */
    constructor(cwd) {
        // === WORKING DIRECTORY CONTEXT ===
        this.cwd = path.resolve(cwd); // Resolve to absolute path for consistency

        logInfo(`Configuration file helper initialized with working directory: ${this.cwd}`);
    }

    /*
    ============================================================================
    BASIC FILE EXISTENCE AND DETECTION
    ============================================================================
    */

    /**
     * Check if a specific file exists within the working directory context
     *
     * Performs a simple existence check for a file, providing the foundation
     * for more complex configuration file analysis operations. Handles path
     * resolution and cross-platform compatibility automatically.
     *
     * @param {string} filename - File name relative to working directory
     * @returns {boolean} True if file exists and is accessible
     */
    hasFile(filename) {
        try {
            const filePath = path.join(this.cwd, filename);

            // === EXISTENCE CHECK ===
            const exists = fs.existsSync(filePath);

            if (exists) {
                logInfo(`File detected: ${chalk.white(filename)}`);
            }

            return exists;
        } catch (error) {
            // === ERROR HANDLING ===
            logWarn(`Cannot check file existence for ${filename}: ${error.message}`);
            return false;
        }
    }

    /*
    ============================================================================
    REQUIRED FILE VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Validate required file existence with comprehensive error reporting
     *
     * Ensures that a critical configuration file exists, providing detailed
     * error messaging and diagnostic information when files are missing.
     * Terminates execution with descriptive error information to guide
     * users in resolving configuration issues.
     *
     * Error Reporting Features:
     * - Clear identification of missing files
     * - Full path information for debugging
     * - Contextual error messages explaining requirements
     * - Process termination for critical missing files
     *
     * @param {string} filename - Required file name
     * @param {string} errorMessage - Additional context for why file is required
     * @returns {string} Full path to the validated file
     * @throws {Process Exit} Terminates process if file is missing
     */
    requireFile(filename, errorMessage) {
        // === EXISTENCE VALIDATION ===
        if (!this.hasFile(filename)) {
            // === COMPREHENSIVE ERROR REPORTING ===
            const missingFileMsg = `Required file '${chalk.white(filename)}' not found in '${chalk.cyan(this.cwd)}'`;
            const reasonMsg = errorMessage ? ` - ${errorMessage}` : '';
            const fullErrorMsg = `${missingFileMsg}${reasonMsg}`;

            // === DETAILED DIAGNOSTIC INFORMATION ===
            logError(fullErrorMsg);
            logInfo(`Expected location: ${chalk.gray(path.join(this.cwd, filename))}`);
            logInfo('This file is required for proper trait validation and setup.');

            // === PROCESS TERMINATION ===
            process.exit(1);
        }

        // === SUCCESS CONFIRMATION ===
        logSuccess(`Required file '${chalk.white(filename)}' found and validated.`);
        return path.join(this.cwd, filename);
    }

    /**
     * Validate optional file existence with flexible reporting
     *
     * Checks for optional configuration files and provides appropriate
     * logging based on whether the file is found. Supports custom messaging
     * for different validation scenarios and project requirements.
     *
     * @param {string} filename - Optional file name to check
     * @param {string} foundMessage - Custom message when file is found
     * @param {string} missingMessage - Custom message when file is missing
     * @returns {boolean} True if file exists
     */
    checkOptionalFile(filename, foundMessage = null, missingMessage = null) {
        if (this.hasFile(filename)) {
            // === FOUND FILE REPORTING ===
            const message = foundMessage || `Optional file '${chalk.white(filename)}' found.`;
            logSuccess(message);
            return true;
        } else {
            // === MISSING FILE REPORTING ===
            if (missingMessage) {
                logInfo(missingMessage);
            } else {
                logInfo(`Optional file '${chalk.white(filename)}' not found (this is acceptable).`);
            }
            return false;
        }
    }

    /*
    ============================================================================
    MULTI-FORMAT CONFIGURATION FILE DISCOVERY
    ============================================================================
    */

    /**
     * Discover first existing configuration file from multiple naming options
     *
     * Searches through an array of possible configuration file names to find
     * the first existing file. This supports tools and frameworks that accept
     * multiple naming conventions for their configuration files.
     *
     * Discovery Process:
     * 1. Iterate through possible file names in order
     * 2. Check existence for each candidate
     * 3. Return first match found
     * 4. Return null if no files exist
     *
     * @param {Array<string>} possibleNames - Array of possible configuration file names
     * @returns {string|null} First existing file name, or null if none found
     */
    findConfig(possibleNames) {
        logInfo(`Searching for configuration files: ${possibleNames.join(', ')}`);

        for (const name of possibleNames) {
            if (this.hasFile(name)) {
                logSuccess(`Configuration file discovered: ${chalk.white(name)}`);
                return name;
            }
        }

        logInfo('No configuration files found from the specified options');
        return null;
    }

    /**
     * Check if any configuration file exists from a list of possibilities
     *
     * Provides a boolean check for the existence of any configuration file
     * from a list of possibilities. Useful for determining if a tool or
     * framework has any configuration present, regardless of naming convention.
     *
     * @param {Array<string>} possibleNames - Array of possible configuration file names
     * @returns {boolean} True if any configuration file exists
     */
    hasAnyConfig(possibleNames) {
        const hasConfig = possibleNames.some(name => this.hasFile(name));

        if (hasConfig) {
            logInfo(`Configuration detected from options: ${possibleNames.join(', ')}`);
        }

        return hasConfig;
    }

    /*
    ============================================================================
    REQUIRED CONFIGURATION VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Require at least one configuration file from multiple options
     *
     * Validates that at least one configuration file exists from a list of
     * acceptable options. Provides comprehensive error reporting with
     * full diagnostic information when no configuration is found.
     *
     * Validation Features:
     * - Multiple naming convention support
     * - Detailed error reporting with all searched locations
     * - Trait-specific error context
     * - Process termination for missing required configurations
     *
     * @param {Array<string>} possibleNames - Array of acceptable configuration file names
     * @param {string} traitName - Name of trait requiring configuration (for error context)
     * @returns {string} Name of the found configuration file
     * @throws {Process Exit} Terminates process if no configuration found
     */
    requireOneOfConfigs(possibleNames, traitName) {
        const foundConfig = this.findConfig(possibleNames);

        if (!foundConfig) {
            // === COMPREHENSIVE ERROR REPORTING ===
            const configList = possibleNames.map(c => chalk.white(c)).join(', ');

            logError(`No ${traitName} configuration file found in '${chalk.cyan(this.cwd)}'`);
            logInfo(`Expected one of: ${configList}`);
            logInfo(`Searched locations:`);

            // === DETAILED SEARCH PATH REPORTING ===
            possibleNames.forEach(name => {
                logInfo(`  ${chalk.gray(path.join(this.cwd, name))}`);
            });

            logInfo(`Please create a ${traitName} configuration file to proceed with validation.`);

            // === PROCESS TERMINATION ===
            process.exit(1);
        }

        // === SUCCESS CONFIRMATION ===
        logSuccess(`${traitName} configuration found: ${chalk.white(foundConfig)}`);
        return foundConfig;
    }

    /**
     * Suggest configuration file creation if none exists
     *
     * Checks for configuration files and provides helpful suggestions when
     * none are found. This is a non-fatal version of requireOneOfConfigs
     * that provides guidance without terminating execution.
     *
     * @param {Array<string>} possibleNames - Array of possible configuration file names
     * @param {string} traitName - Name of trait for contextual messaging
     * @returns {string|null} Found configuration file name, or null if none exists
     */
    suggestConfigIfMissing(possibleNames, traitName) {
        const foundConfig = this.findConfig(possibleNames);

        if (foundConfig) {
            // === CONFIGURATION FOUND ===
            logSuccess(`${traitName} configuration found: ${chalk.white(foundConfig)}`);
            return foundConfig;
        } else {
            // === SUGGESTION MESSAGING ===
            const configList = possibleNames.map(c => chalk.cyan(c)).join(', ');
            logInfo(`No ${traitName} configuration file found in '${chalk.cyan(this.cwd)}'. Consider adding one of: ${configList}`);
            logInfo(`This would enable enhanced ${traitName} validation and optimization.`);
            return null;
        }
    }

    /*
    ============================================================================
    JSON FILE PARSING AND VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Read and parse JSON configuration files with comprehensive error handling
     *
     * Provides robust JSON file reading and parsing with graceful error handling.
     * Returns parsed content or null for missing/invalid files, allowing
     * calling code to handle different scenarios appropriately.
     *
     * Error Handling:
     * - Missing file handling (returns null)
     * - JSON syntax error recovery
     * - File access permission issues
     * - Encoding and format problems
     *
     * @param {string} filename - JSON file name to read and parse
     * @returns {Object|null} Parsed JSON object, or null if file missing/invalid
     */
    readJsonFile(filename) {
        const filePath = path.join(this.cwd, filename);

        // === FILE EXISTENCE CHECK ===
        if (!fs.existsSync(filePath)) {
            logInfo(`JSON file not found: ${filename}`);
            return null;
        }

        try {
            // === FILE READING AND PARSING ===
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);

            logSuccess(`JSON file parsed successfully: ${chalk.white(filename)}`);
            return parsed;
        } catch (error) {
            // === COMPREHENSIVE ERROR HANDLING ===
            logWarn(`Could not parse JSON file '${chalk.white(filename)}' at '${chalk.gray(filePath)}': ${error.message}`);

            // === ADDITIONAL ERROR CONTEXT ===
            if (error instanceof SyntaxError) {
                logInfo('This appears to be a JSON syntax error. Please check the file format.');
            }

            return null;
        }
    }

    /**
     * Validate JSON file syntax and structure with configurable error handling
     *
     * Performs comprehensive JSON file validation with configurable error
     * handling. Can either terminate execution on invalid JSON or provide
     * warnings while continuing execution.
     *
     * Validation Features:
     * - JSON syntax validation
     * - File accessibility verification
     * - Configurable error severity (fatal vs warning)
     * - Detailed error reporting with context
     *
     * @param {string} filename - JSON file name to validate
     * @param {boolean} errorOnInvalid - Whether to terminate on invalid JSON
     * @returns {Object|null} Parsed JSON object, or null if invalid/missing
     */
    validateJsonFile(filename, errorOnInvalid = true) {
        const filePath = path.join(this.cwd, filename);

        // === FILE EXISTENCE CHECK ===
        if (!fs.existsSync(filePath)) {
            logInfo(`JSON validation skipped - file not found: ${filename}`);
            return null;
        }

        try {
            // === JSON PARSING AND VALIDATION ===
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);

            logSuccess(`JSON validation passed: '${chalk.white(filename)}' contains valid JSON.`);
            return parsed;
        } catch (error) {
            // === ERROR HANDLING WITH CONFIGURABLE SEVERITY ===
            const message = `JSON validation failed for '${chalk.white(filename)}' at '${chalk.gray(filePath)}': ${error.message}`;

            if (errorOnInvalid) {
                // === FATAL ERROR HANDLING ===
                logError(message);
                logInfo('Please fix the JSON syntax errors before continuing.');
                process.exit(1);
            } else {
                // === WARNING HANDLING ===
                logWarn(message);
                logInfo('Continuing with validation, but this file may not function correctly.');
                return null;
            }
        }
    }

    /*
    ============================================================================
    TEXT FILE CONTENT ANALYSIS SYSTEM
    ============================================================================
    */

    /**
     * Read text file content with comprehensive error handling
     *
     * Provides robust text file reading capabilities with proper error
     * handling for various file access scenarios. Returns content as
     * string or null for missing/inaccessible files.
     *
     * @param {string} filename - Text file name to read
     * @returns {string|null} File content as string, or null if unavailable
     */
    readTextFile(filename) {
        const filePath = path.join(this.cwd, filename);

        // === FILE EXISTENCE CHECK ===
        if (!fs.existsSync(filePath)) {
            logInfo(`Text file not found: ${filename}`);
            return null;
        }

        try {
            // === FILE CONTENT READING ===
            const content = fs.readFileSync(filePath, 'utf8');

            logSuccess(`Text file read successfully: ${chalk.white(filename)} (${content.length} characters)`);
            return content;
        } catch (error) {
            // === ERROR HANDLING ===
            logWarn(`Could not read text file '${chalk.white(filename)}' at '${chalk.gray(filePath)}': ${error.message}`);
            return null;
        }
    }

    /*
    ============================================================================
    GIT IGNORE FILE VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Comprehensive .gitignore validation with entry requirement checking
     *
     * Analyzes .gitignore files to ensure proper exclusion of build artifacts,
     * dependencies, and other files that shouldn't be committed to version
     * control. Supports trait-specific validation requirements.
     *
     * Validation Features:
     * - .gitignore file existence checking
     * - Required entry validation
     * - Missing entry identification and reporting
     * - Trait-specific context messaging
     * - Comprehensive path reporting for debugging
     *
     * Common Required Entries:
     * - node_modules/ (Node.js dependencies)
     * - dist/, build/ (Build artifacts)
     * - .env (Environment variables)
     * - *.log (Log files)
     * - coverage/ (Test coverage reports)
     *
     * @param {Array<string>} requiredEntries - Array of entries that must be in .gitignore
     * @param {string} traitName - Name of trait for contextual messaging
     * @returns {boolean} True if .gitignore exists and contains all required entries
     */
    validateGitignore(requiredEntries = [], traitName = '') {
        const gitignoreContent = this.readTextFile('.gitignore');
        const gitignorePath = path.join(this.cwd, '.gitignore');

        // === GITIGNORE EXISTENCE VALIDATION ===
        if (!gitignoreContent) {
            if (requiredEntries.length > 0) {
                const entriesList = requiredEntries.map(e => chalk.cyan(e)).join(', ');
                logWarn(`${chalk.white('.gitignore')} file not found at '${chalk.gray(gitignorePath)}'.`);
                logInfo(`Consider creating one to exclude: ${entriesList}`);
                logInfo('This will prevent committing generated files and dependencies to version control.');
            }
            return false;
        }

        // === REQUIRED ENTRY VALIDATION ===
        const missingEntries = requiredEntries.filter(entry => {
            // Support both exact matches and pattern matches
            return !gitignoreContent.includes(entry);
        });

        if (missingEntries.length === 0) {
            // === VALIDATION SUCCESS ===
            const context = traitName ? ` for ${traitName}` : '';
            logSuccess(`${chalk.white('.gitignore')} properly excludes required artifacts${context}.`);
            return true;
        } else {
            // === MISSING ENTRIES REPORTING ===
            const missingList = missingEntries.map(e => chalk.cyan(e)).join(', ');
            logWarn(`${chalk.white('.gitignore')} at '${chalk.gray(gitignorePath)}' should include: ${missingList}`);

            // === IMPROVEMENT SUGGESTIONS ===
            logInfo('Add these entries to prevent committing unwanted files:');
            missingEntries.forEach(entry => {
                logInfo(`  ${chalk.cyan(entry)}`);
            });

            return false;
        }
    }

    /*
    ============================================================================
    UTILITY AND INTROSPECTION METHODS
    ============================================================================
    */

    /**
     * Get full absolute path for a filename within the working directory
     *
     * @param {string} filename - File name to resolve
     * @returns {string} Full absolute path to the file
     */
    getFullPath(filename) {
        return path.join(this.cwd, filename);
    }

    /**
     * Get the current working directory
     *
     * @returns {string} Absolute path of the working directory
     */
    getCurrentDirectory() {
        return this.cwd;
    }

    /**
     * Create a new config helper with a different working directory
     *
     * @param {string} newCwd - New working directory path
     * @returns {ConfigFileHelper} New ConfigFileHelper instance
     */
    withWorkingDirectory(newCwd) {
        return new ConfigFileHelper(newCwd);
    }

    /**
     * Check if the working directory exists and is accessible
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
     * Get comprehensive statistics about configuration files in the working directory
     *
     * @returns {Object} Statistics object with configuration file analysis
     */
    getConfigStats() {
        if (!this.isWorkingDirectoryValid()) {
            return {
                valid: false,
                totalFiles: 0,
                jsonFiles: 0,
                configFiles: 0
            };
        }

        try {
            const files = fs.readdirSync(this.cwd);
            const jsonFiles = files.filter(f => f.endsWith('.json')).length;
            const configFiles = files.filter(f =>
                f.startsWith('.') || f.includes('config') || f.includes('rc')
            ).length;

            return {
                valid: true,
                totalFiles: files.length,
                jsonFiles,
                configFiles
            };
        } catch (error) {
            logWarn(`Cannot gather configuration statistics: ${error.message}`);
            return {
                valid: false,
                totalFiles: 0,
                jsonFiles: 0,
                configFiles: 0
            };
        }
    }
}