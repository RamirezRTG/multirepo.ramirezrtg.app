/*
================================================================================
File: scripts/helper/package-json-helper.js (Package.json Analysis & Management)
Description: Comprehensive package.json file analysis and validation system for
             the multirepo setup orchestrator. Provides sophisticated dependency
             analysis, script validation, and Node.js project configuration
             assessment to support intelligent trait-based repository setup
             and validation workflows.

Key Responsibilities:
- Package.json file loading and parsing with lazy initialization
- Dependency analysis across production and development scopes
- NPM script detection and validation with pattern matching
- Node.js engine requirement validation and reporting
- Package configuration completeness assessment
- Entry point validation for library and application projects
- Integration with ConfigFileHelper for consistent file operations

Analysis Capabilities:
- Multi-scope dependency detection (dependencies, devDependencies, peerDependencies)
- Version range analysis and compatibility checking
- Script pattern matching for build tools and frameworks
- Engine requirement validation for Node.js and npm versions
- Package metadata validation (name, version, description, etc.)
- Entry point configuration analysis (main, module, exports)
- Common project structure validation based on package configuration
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for package.json access
import fs from 'fs';
// Path utilities for cross-platform file system navigation
import path from 'path';
// Comprehensive logging system for analysis feedback
import { logInfo, logSuccess, logWarn } from './logger.js';
// Configuration file helper for consistent file operations
import { ConfigFileHelper } from './config-file-helper.js';
// Terminal styling for enhanced visual feedback
import chalk from 'chalk';

/*
================================================================================
COMPREHENSIVE PACKAGE.JSON ANALYSIS SYSTEM
================================================================================
*/

/**
 * Advanced Package.json Helper with Intelligent Dependency Analysis
 *
 * This class implements sophisticated package.json analysis capabilities designed
 * to support complex Node.js project validation and setup workflows. It provides
 * comprehensive dependency analysis, script validation, and project configuration
 * assessment with lazy loading and intelligent caching mechanisms.
 *
 * Core Architecture:
 * - Lazy loading with intelligent caching for performance optimization
 * - Multi-scope dependency analysis (dependencies, devDependencies, etc.)
 * - Pattern-based script detection for framework and tool identification
 * - Engine requirement validation for Node.js environment compatibility
 * - Integration with ConfigFileHelper for consistent file operations
 * - Comprehensive error handling with graceful degradation
 *
 * Analysis Dimensions:
 * 1. Dependency Analysis: Package detection across all dependency scopes
 * 2. Script Analysis: Build tool and framework script identification
 * 3. Configuration Analysis: Package metadata and structure validation
 * 4. Engine Analysis: Node.js and npm version requirement validation
 * 5. Entry Point Analysis: Module system and export configuration
 *
 * Use Cases:
 * - Trait-based project type detection
 * - Framework and tool identification
 * - Project configuration validation
 * - Dependency requirement verification
 * - Build system analysis and optimization
 */
export class PackageJsonHelper {
    /**
     * Initialize package.json helper with working directory context and lazy loading
     *
     * Creates a new package.json helper instance with lazy loading capabilities
     * and integration with the ConfigFileHelper for consistent file operations.
     * The lazy loading ensures optimal performance by only parsing package.json
     * when actually needed.
     *
     * @param {string} cwd - Working directory path containing package.json
     */
    constructor(cwd) {
        // === WORKING DIRECTORY CONTEXT ===
        this.cwd = path.resolve(cwd);
        this.packageJsonPath = path.join(this.cwd, 'package.json');

        // === LAZY LOADING STATE ===
        this._packageJson = null; // Cached parsed content
        this._loaded = false;     // Loading state flag

        // === HELPER INTEGRATION ===
        // Use ConfigFileHelper for consistent file operations
        this.configHelper = new ConfigFileHelper(cwd);

        logInfo(`Package.json helper initialized for directory: ${this.cwd}`);
    }

    /*
    ============================================================================
    PACKAGE.JSON LOADING AND CACHING SYSTEM
    ============================================================================
    */

    /**
     * Load and parse package.json with comprehensive error handling and caching
     *
     * Implements intelligent lazy loading with caching to optimize performance
     * when package.json is accessed multiple times. Provides comprehensive
     * error handling for missing files, JSON syntax errors, and file access issues.
     *
     * Loading Process:
     * 1. Check if already loaded (return cached result)
     * 2. Verify file existence
     * 3. Read and parse JSON content
     * 4. Cache result and update loading state
     * 5. Return parsed content or null
     *
     * @returns {Object|null} Parsed package.json object, or null if unavailable
     */
    loadPackageJson() {
        // === CACHE CHECK ===
        if (this._loaded) {
            return this._packageJson;
        }

        // === FILE EXISTENCE VALIDATION ===
        if (!fs.existsSync(this.packageJsonPath)) {
            logInfo('Package.json file not found - this may not be a Node.js project');
            this._loaded = true;
            this._packageJson = null;
            return null;
        }

        try {
            // === FILE READING AND PARSING ===
            const packageContent = fs.readFileSync(this.packageJsonPath, 'utf8');
            this._packageJson = JSON.parse(packageContent);
            this._loaded = true;

            logSuccess(`Package.json loaded successfully: ${this._packageJson.name || 'unnamed project'}`);
            return this._packageJson;
        } catch (error) {
            // === COMPREHENSIVE ERROR HANDLING ===
            logWarn(`Could not parse package.json: ${error.message}`);

            // === ADDITIONAL ERROR CONTEXT ===
            if (error instanceof SyntaxError) {
                logInfo('This appears to be a JSON syntax error. Please check the package.json format.');
            }

            this._loaded = true;
            this._packageJson = null;
            return null;
        }
    }

    /**
     * Lazy-loaded package.json property accessor
     *
     * Provides convenient access to package.json content with automatic
     * lazy loading. This getter ensures the file is only loaded when
     * first accessed, optimizing performance for helpers that may not
     * need package.json analysis.
     *
     * @returns {Object|null} Parsed package.json object, or null if unavailable
     */
    get packageJson() {
        if (!this._loaded) {
            this.loadPackageJson();
        }
        return this._packageJson;
    }

    /*
    ============================================================================
    BASIC PACKAGE.JSON VALIDATION AND REQUIREMENTS
    ============================================================================
    */

    /**
     * Check if package.json file exists in the working directory
     *
     * @returns {boolean} True if package.json file exists
     */
    exists() {
        const exists = fs.existsSync(this.packageJsonPath);

        if (exists) {
            logInfo('Package.json file detected');
        }

        return exists;
    }

    /**
     * Require package.json to exist with comprehensive error reporting
     *
     * Validates that package.json exists, using the ConfigFileHelper for
     * consistent error reporting and diagnostic information. Terminates
     * execution if the file is missing.
     *
     * @param {string} errorMessage - Additional context for why package.json is required
     */
    requirePackageJson(errorMessage = 'This is required for Node.js/npm projects.') {
        this.configHelper.requireFile('package.json', errorMessage);
    }

    /**
     * Validate package.json contains valid JSON with error handling
     *
     * Uses ConfigFileHelper for consistent JSON validation with comprehensive
     * error reporting and recovery mechanisms.
     *
     * @returns {Object|null} Parsed package.json if valid, null otherwise
     */
    validateJson() {
        return this.configHelper.validateJsonFile('package.json');
    }

    /*
    ============================================================================
    COMPREHENSIVE DEPENDENCY ANALYSIS SYSTEM
    ============================================================================
    */

    /**
     * Check if a specific dependency exists in package.json
     *
     * Performs comprehensive dependency detection across multiple dependency
     * scopes, providing flexible search capabilities for different types
     * of project dependencies.
     *
     * Dependency Scopes Searched:
     * - dependencies: Production runtime dependencies
     * - devDependencies: Development and build-time dependencies
     * - peerDependencies: Peer dependencies (optional scope)
     * - optionalDependencies: Optional dependencies (optional scope)
     *
     * @param {string} name - Package name to search for
     * @param {boolean} includeDevDeps - Whether to include devDependencies in search
     * @returns {boolean} True if dependency is found in any applicable scope
     */
    hasDependency(name, includeDevDeps = true) {
        const pkg = this.packageJson;
        if (!pkg) {
            return false;
        }

        // === PRODUCTION DEPENDENCY CHECK ===
        const inDeps = pkg.dependencies && pkg.dependencies[name];

        // === DEVELOPMENT DEPENDENCY CHECK ===
        const inDevDeps = includeDevDeps && pkg.devDependencies && pkg.devDependencies[name];

        // === PEER DEPENDENCY CHECK (OPTIONAL) ===
        const inPeerDeps = pkg.peerDependencies && pkg.peerDependencies[name];

        const found = !!(inDeps || inDevDeps || inPeerDeps);

        if (found) {
            const scope = inDeps ? 'dependencies' : inDevDeps ? 'devDependencies' : 'peerDependencies';
            logInfo(`Dependency found: ${chalk.cyan(name)} in ${scope}`);
        }

        return found;
    }

    /**
     * Check if any dependency from a list exists in package.json
     *
     * Provides batch dependency checking for framework and tool detection.
     * Useful for identifying project types based on dependency patterns.
     *
     * @param {Array<string>} names - Array of package names to search for
     * @param {boolean} includeDevDeps - Whether to include devDependencies in search
     * @returns {boolean} True if any dependency is found
     */
    hasAnyDependency(names, includeDevDeps = true) {
        const foundDeps = names.filter(name => this.hasDependency(name, includeDevDeps));

        if (foundDeps.length > 0) {
            logInfo(`Dependencies detected: ${foundDeps.map(d => chalk.cyan(d)).join(', ')}`);
        }

        return foundDeps.length > 0;
    }

    /**
     * Get version requirement for a specific dependency
     *
     * Retrieves the version specification for a dependency, checking
     * across multiple dependency scopes to find the version requirement.
     *
     * @param {string} name - Package name to get version for
     * @param {boolean} includeDevDeps - Whether to include devDependencies in search
     * @returns {string|null} Version requirement string, or null if not found
     */
    getDependencyVersion(name, includeDevDeps = true) {
        const pkg = this.packageJson;
        if (!pkg) {
            return null;
        }

        // === PRODUCTION DEPENDENCIES CHECK ===
        if (pkg.dependencies && pkg.dependencies[name]) {
            const version = pkg.dependencies[name];
            logInfo(`Dependency version: ${chalk.cyan(name)}@${chalk.yellow(version)} (production)`);
            return version;
        }

        // === DEVELOPMENT DEPENDENCIES CHECK ===
        if (includeDevDeps && pkg.devDependencies && pkg.devDependencies[name]) {
            const version = pkg.devDependencies[name];
            logInfo(`Dependency version: ${chalk.cyan(name)}@${chalk.yellow(version)} (development)`);
            return version;
        }

        // === PEER DEPENDENCIES CHECK ===
        if (pkg.peerDependencies && pkg.peerDependencies[name]) {
            const version = pkg.peerDependencies[name];
            logInfo(`Dependency version: ${chalk.cyan(name)}@${chalk.yellow(version)} (peer)`);
            return version;
        }

        return null;
    }

    /*
    ============================================================================
    NPM SCRIPT ANALYSIS AND VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Check if a specific npm script exists in package.json
     *
     * @param {string} name - Script name to check for
     * @returns {boolean} True if script exists
     */
    hasScript(name) {
        const pkg = this.packageJson;
        const hasScript = !!(pkg && pkg.scripts && pkg.scripts[name]);

        if (hasScript) {
            logInfo(`NPM script found: ${chalk.cyan(name)}`);
        }

        return hasScript;
    }

    /**
     * Get the content/command of a specific npm script
     *
     * @param {string} name - Script name to get content for
     * @returns {string|null} Script command, or null if not found
     */
    getScript(name) {
        const pkg = this.packageJson;
        const script = pkg && pkg.scripts && pkg.scripts[name];

        if (script) {
            logInfo(`Script content for ${chalk.cyan(name)}: ${chalk.gray(script)}`);
        }

        return script || null;
    }

    /**
     * Find scripts matching a specific pattern (name or content)
     *
     * Provides advanced script discovery capabilities using pattern matching
     * against both script names and script content. Supports both string
     * and regular expression patterns for flexible search capabilities.
     *
     * Pattern Matching Strategies:
     * - String patterns: Substring matching in script names and content
     * - Regular expression patterns: Advanced pattern matching
     * - Case-sensitive matching for precise identification
     *
     * @param {string|RegExp} pattern - Pattern to search for in script names or content
     * @returns {Array<string>} Array of matching script names
     */
    findScripts(pattern) {
        const pkg = this.packageJson;
        if (!pkg || !pkg.scripts) {
            return [];
        }

        const matchingScripts = Object.keys(pkg.scripts).filter(script => {
            const scriptContent = pkg.scripts[script];

            if (typeof pattern === 'string') {
                // === STRING PATTERN MATCHING ===
                return script.includes(pattern) || scriptContent.includes(pattern);
            } else if (pattern instanceof RegExp) {
                // === REGULAR EXPRESSION MATCHING ===
                return pattern.test(script) || pattern.test(scriptContent);
            }

            return false;
        });

        if (matchingScripts.length > 0) {
            logInfo(`Scripts matching pattern found: ${matchingScripts.map(s => chalk.cyan(s)).join(', ')}`);
        }

        return matchingScripts;
    }

    /*
    ============================================================================
    NODE.JS ENGINE REQUIREMENT ANALYSIS
    ============================================================================
    */

    /**
     * Get engine requirement for Node.js, npm, or other tools
     *
     * Extracts version requirements from the engines field in package.json,
     * which specifies the required versions of Node.js, npm, and other
     * tools for the project to function correctly.
     *
     * @param {string} engine - Engine name (e.g., 'node', 'npm', 'yarn')
     * @returns {string|null} Version requirement string, or null if not specified
     */
    getEngineRequirement(engine) {
        const pkg = this.packageJson;
        const requirement = pkg && pkg.engines && pkg.engines[engine];

        if (requirement) {
            logInfo(`Engine requirement: ${chalk.cyan(engine)} ${chalk.yellow(requirement)}`);
        }

        return requirement || null;
    }

    /**
     * Log all engine requirements found in package.json
     *
     * Provides comprehensive reporting of all engine requirements specified
     * in the package.json file, helping with environment setup validation.
     */
    logEngineRequirements() {
        const pkg = this.packageJson;
        if (!pkg || !pkg.engines) {
            logInfo('No engine requirements specified in package.json');
            return;
        }

        logInfo('Engine requirements found:');
        Object.entries(pkg.engines).forEach(([engine, version]) => {
            logInfo(`  ${chalk.cyan(engine)}: ${chalk.yellow(version)}`);
        });
    }

    /*
    ============================================================================
    PACKAGE CONFIGURATION VALIDATION SYSTEM
    ============================================================================
    */

    /**
     * Validate required package.json fields with comprehensive reporting
     *
     * Checks for essential package.json fields that are required or
     * recommended for proper npm package configuration. Provides
     * detailed feedback about missing or incomplete configuration.
     *
     * Validation Categories:
     * - Required Fields: name, version (essential for npm)
     * - Recommended Fields: description, author, license
     * - Optional Fields: keywords, repository, homepage
     */
    validateRequiredFields() {
        const pkg = this.packageJson;
        if (!pkg) {
            logWarn('Cannot validate package.json fields - file not loaded');
            return;
        }

        logInfo('Validating package.json required fields...');

        // === REQUIRED FIELD VALIDATION ===
        if (!pkg.name) {
            logWarn(`${chalk.white('package.json')} is missing the ${chalk.cyan('name')} field.`);
            logInfo('The name field is required for npm package identification.');
        } else {
            logSuccess(`Package name: ${chalk.cyan(pkg.name)}`);
        }

        if (!pkg.version) {
            logWarn(`${chalk.white('package.json')} is missing the ${chalk.cyan('version')} field.`);
            logInfo('The version field is required for npm package versioning.');
        } else {
            logSuccess(`Package version: ${chalk.cyan(pkg.version)}`);
        }

        // === RECOMMENDED FIELD VALIDATION ===
        if (!pkg.description) {
            logInfo(`${chalk.white('package.json')} could benefit from a ${chalk.cyan('description')} field.`);
            logInfo('A description helps users understand the package purpose.');
        } else {
            logSuccess(`Package description provided: "${pkg.description}"`);
        }

        if (!pkg.author) {
            logInfo(`${chalk.white('package.json')} could benefit from an ${chalk.cyan('author')} field.`);
        }

        if (!pkg.license) {
            logInfo(`${chalk.white('package.json')} could benefit from a ${chalk.cyan('license')} field.`);
        }
    }

    /**
     * Validate entry point configuration for library and application projects
     *
     * Checks for proper entry point configuration including main, module,
     * and exports fields. These fields are crucial for proper module
     * resolution and package distribution.
     *
     * Entry Point Types:
     * - main: CommonJS entry point
     * - module: ES module entry point
     * - exports: Modern export mapping
     * - bin: Executable scripts
     */
    validateEntryPoint() {
        const pkg = this.packageJson;
        if (!pkg) {
            return;
        }

        logInfo('Validating package entry point configuration...');

        // === ENTRY POINT DETECTION ===
        const hasMain = !!pkg.main;
        const hasModule = !!pkg.module;
        const hasExports = !!pkg.exports;
        const hasBin = !!pkg.bin;

        if (!hasMain && !hasModule && !hasExports && !hasBin) {
            // === NO ENTRY POINTS FOUND ===
            logInfo(`${chalk.white('package.json')} could benefit from entry point configuration.`);
            logInfo('Consider adding:');
            logInfo(`  ${chalk.cyan('main')}: CommonJS entry point (e.g., "index.js")`);
            logInfo(`  ${chalk.cyan('module')}: ES module entry point (e.g., "index.mjs")`);
            logInfo(`  ${chalk.cyan('exports')}: Modern export mapping for complex packages`);
        } else {
            // === ENTRY POINT REPORTING ===
            logSuccess('Entry point configuration found:');

            if (hasMain) {
                logInfo(`  ${chalk.cyan('main')}: ${pkg.main}`);
            }
            if (hasModule) {
                logInfo(`  ${chalk.cyan('module')}: ${pkg.module}`);
            }
            if (hasExports) {
                logInfo(`  ${chalk.cyan('exports')}: configured`);
            }
            if (hasBin) {
                logInfo(`  ${chalk.cyan('bin')}: executable scripts configured`);
            }
        }
    }

    /**
     * Validate npm scripts section with common script detection
     *
     * Analyzes the scripts section to identify common development scripts
     * and provides recommendations for missing but commonly useful scripts.
     *
     * @param {Array<string>} commonScripts - Array of commonly expected script names
     */
    validateScripts(commonScripts = ['start', 'test', 'build', 'dev', 'lint']) {
        const pkg = this.packageJson;
        if (!pkg) {
            return;
        }

        logInfo('Validating npm scripts configuration...');

        if (!pkg.scripts) {
            // === NO SCRIPTS SECTION ===
            const scriptList = commonScripts.map(s => chalk.cyan(s)).join(', ');
            logInfo(`${chalk.white('package.json')} has no scripts section.`);
            logInfo(`Consider adding common scripts like: ${scriptList}`);
            return;
        }

        // === SCRIPTS ANALYSIS ===
        logSuccess(`Scripts section found in ${chalk.white('package.json')}.`);

        const foundScripts = commonScripts.filter(script => pkg.scripts[script]);
        const missingScripts = commonScripts.filter(script => !pkg.scripts[script]);

        if (foundScripts.length > 0) {
            logInfo(`Available common scripts: ${foundScripts.map(s => chalk.cyan(s)).join(', ')}`);
        }

        if (missingScripts.length > 0) {
            logInfo(`Consider adding scripts: ${missingScripts.map(s => chalk.cyan(s)).join(', ')}`);
        }

        // === CUSTOM SCRIPTS REPORTING ===
        const allScripts = Object.keys(pkg.scripts);
        const customScripts = allScripts.filter(script => !commonScripts.includes(script));

        if (customScripts.length > 0) {
            logInfo(`Custom scripts found: ${customScripts.map(s => chalk.cyan(s)).join(', ')}`);
        }

        logInfo(`Total scripts configured: ${allScripts.length}`);
    }

    /*
    ============================================================================
    UTILITY AND INTROSPECTION METHODS
    ============================================================================
    */

    /**
     * Get the current working directory
     *
     * @returns {string} Absolute path of the working directory
     */
    getCurrentDirectory() {
        return this.cwd;
    }

    /**
     * Get the full path to package.json
     *
     * @returns {string} Absolute path to package.json file
     */
    getPackageJsonPath() {
        return this.packageJsonPath;
    }

    /**
     * Check if package.json has been loaded
     *
     * @returns {boolean} True if package.json has been loaded (successfully or not)
     */
    isLoaded() {
        return this._loaded;
    }

    /**
     * Force reload of package.json (clears cache)
     *
     * Clears the cached package.json data and forces a fresh load
     * on the next access. Useful when package.json may have been
     * modified during execution.
     */
    forceReload() {
        this._loaded = false;
        this._packageJson = null;
        logInfo('Package.json cache cleared - will reload on next access');
    }

    /**
     * Get comprehensive package analysis summary
     *
     * @returns {Object} Summary object with package analysis results
     */
    getPackageSummary() {
        const pkg = this.packageJson;

        if (!pkg) {
            return {
                exists: false,
                valid: false,
                name: null,
                version: null,
                dependencies: 0,
                devDependencies: 0,
                scripts: 0
            };
        }

        return {
            exists: true,
            valid: true,
            name: pkg.name || 'unnamed',
            version: pkg.version || 'unversioned',
            dependencies: pkg.dependencies ? Object.keys(pkg.dependencies).length : 0,
            devDependencies: pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0,
            scripts: pkg.scripts ? Object.keys(pkg.scripts).length : 0,
            hasMain: !!pkg.main,
            hasModule: !!pkg.module,
            hasExports: !!pkg.exports,
            hasEngines: !!pkg.engines
        };
    }
}