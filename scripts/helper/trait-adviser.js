
/*
================================================================================
File: scripts/helper/trait-adviser.js (Intelligent Trait Recommendation System)
Description: Advanced trait suggestion engine for the multirepo setup orchestrator.
             Analyzes repository content, dependencies, and configuration files to
             intelligently recommend appropriate traits that enhance setup validation
             and behavior. Provides contextual suggestions based on detected frameworks,
             tools, and development patterns to optimize repository setup workflows.

Key Responsibilities:
- Framework detection through dependency analysis (React, Vue, Express, etc.)
- Development tool identification via configuration files (ESLint, Prettier, Jest, etc.)
- Build system recognition through package and config analysis (Webpack, Vite, etc.)
- Intelligent trait filtering to avoid duplicate suggestions
- Contextual messaging for user-friendly trait recommendations
- Comprehensive repository analysis across multiple detection dimensions

Detection Strategies:
- Package.json dependency scanning for installed frameworks and tools
- Configuration file presence analysis for tool setups
- Combined detection patterns for robust framework identification
- Multi-dimensional analysis combining dependencies and configurations
- Intelligent filtering based on already active traits
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// Logging system for trait suggestion output
import { logInfo } from './logger.js';
// Terminal styling for enhanced recommendation display
import chalk from 'chalk';

/*
================================================================================
INTELLIGENT TRAIT RECOMMENDATION ENGINE
================================================================================
*/

/**
 * Advanced Trait Adviser with Multi-Dimensional Repository Analysis
 *
 * This class implements sophisticated repository analysis to identify missing
 * traits that could enhance the setup process. It examines multiple dimensions
 * of repository content including dependencies, configuration files, and
 * directory structures to provide intelligent trait recommendations.
 *
 * Core Architecture:
 * - Multi-helper integration for comprehensive analysis
 * - Framework detection through dependency patterns
 * - Tool identification via configuration file presence
 * - Intelligent filtering to prevent duplicate suggestions
 * - Contextual messaging for clear user guidance
 * - Extensible detection patterns for new frameworks and tools
 *
 * Analysis Dimensions:
 * 1. Dependency Analysis: Package.json scanning for installed libraries
 * 2. Configuration Analysis: Presence of tool-specific config files
 * 3. Directory Structure: File and folder patterns indicating tool usage
 * 4. Combined Patterns: Multi-factor detection for robust identification
 *
 * Recommendation Categories:
 * - Framework Traits: React, Vue, Express, Next.js, etc.
 * - Tool Traits: TypeScript, ESLint, Prettier, Jest, etc.
 * - Build System Traits: Webpack, Vite, Rollup, etc.
 * - Platform Traits: Docker, Node.js, PHP, etc.
 */
export class TraitAdviser {
    /**
     * Initialize trait adviser with repository analysis helpers
     *
     * Creates a new trait adviser instance with access to specialized helper
     * classes for different types of repository analysis. The helpers provide
     * standardized interfaces for examining different aspects of repository
     * configuration and content.
     *
     * @param {Array<string>|string} activeTraits - Currently active traits to avoid duplicating
     * @param {Object} packageHelper - Package.json analysis helper (optional)
     * @param {Object} configHelper - Configuration file analysis helper (optional)
     * @param {Object} directoryHelper - Directory structure analysis helper (optional)
     */
    constructor(activeTraits, packageHelper = null, configHelper = null, directoryHelper = null) {
        // === ACTIVE TRAITS NORMALIZATION ===
        // Ensure activeTraits is always an array for consistent processing
        this.activeTraits = Array.isArray(activeTraits) ? activeTraits : (activeTraits ? [activeTraits] : []);

        // === ANALYSIS HELPER INTEGRATION ===
        // Store references to specialized analysis helpers
        this.packageHelper = packageHelper;   // Package.json dependency analysis
        this.configHelper = configHelper;     // Configuration file detection
        this.directoryHelper = directoryHelper; // Directory structure analysis

        logInfo(`Trait adviser initialized with ${this.activeTraits.length} active traits`);
    }

    /*
    ============================================================================
    CORE TRAIT MANAGEMENT OPERATIONS
    ============================================================================
    */

    /**
     * Check if a specific trait is already active
     *
     * Provides a simple boolean check to determine if a trait is already
     * configured for the repository, preventing duplicate suggestions.
     *
     * @param {string} traitName - Name of the trait to check
     * @returns {boolean} True if the trait is already active
     */
    hasActiveTrait(traitName) {
        const isActive = this.activeTraits.includes(traitName);

        if (isActive) {
            logInfo(`Trait '${traitName}' is already active - skipping suggestion`);
        }

        return isActive;
    }

    /*
    ============================================================================
    GENERIC TRAIT SUGGESTION SYSTEM
    ============================================================================
    */

    /**
     * Universal trait suggestion engine with custom detection logic
     *
     * Provides a flexible foundation for trait suggestions by accepting
     * custom detection functions. This allows for complex, repository-specific
     * analysis patterns while maintaining consistent suggestion behavior.
     *
     * Suggestion Process:
     * 1. Check if trait is already active (skip if so)
     * 2. Execute custom detection function
     * 3. Log suggestion message if detection succeeds
     * 4. Return suggestion status for further processing
     *
     * @param {string} traitName - Name of the trait to potentially suggest
     * @param {Function} detectionFunction - Custom function that returns boolean for detection
     * @param {string} message - Custom message to display when suggesting trait
     * @returns {boolean} True if trait was suggested (not already active and detected)
     */
    suggestTrait(traitName, detectionFunction, message) {
        // === ACTIVE TRAIT FILTERING ===
        if (this.hasActiveTrait(traitName)) {
            return false; // Already active, no suggestion needed
        }

        // === CUSTOM DETECTION EXECUTION ===
        try {
            const detected = detectionFunction();

            if (detected) {
                // === SUGGESTION MESSAGING ===
                const suggestionMessage = message ||
                    `${traitName} detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
                logInfo(suggestionMessage);
                return true;
            }
        } catch (error) {
            logInfo(`Detection function failed for trait '${traitName}': ${error.message}`);
        }

        return false;
    }

    /*
    ============================================================================
    DEPENDENCY-BASED TRAIT SUGGESTIONS
    ============================================================================
    */

    /**
     * Suggest traits based on package.json dependency analysis
     *
     * Analyzes package.json dependencies (both dependencies and devDependencies)
     * to identify installed packages that indicate the use of specific frameworks
     * or tools. Provides targeted suggestions based on dependency patterns.
     *
     * Detection Process:
     * 1. Check if trait is already active
     * 2. Verify package helper is available
     * 3. Search for any of the specified dependencies
     * 4. Generate suggestion with contextual messaging
     *
     * @param {string} traitName - Name of the trait to suggest
     * @param {Array<string>} dependencies - Array of package names to search for
     * @param {string} message - Custom suggestion message (optional)
     * @returns {boolean} True if trait was suggested based on dependencies
     */
    suggestTraitByDependency(traitName, dependencies, message = null) {
        // === PREREQUISITE CHECKS ===
        if (this.hasActiveTrait(traitName) || !this.packageHelper) {
            return false;
        }

        // === DEPENDENCY DETECTION ===
        const hasDeps = this.packageHelper.hasAnyDependency(dependencies);

        if (hasDeps) {
            // === CONTEXTUAL MESSAGING ===
            const defaultMessage = `${dependencies[0]} dependencies detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
            logInfo(message || defaultMessage);
            return true;
        }

        return false;
    }

    /*
    ============================================================================
    CONFIGURATION-BASED TRAIT SUGGESTIONS
    ============================================================================
    */

    /**
     * Suggest traits based on configuration file presence analysis
     *
     * Examines the repository for the presence of specific configuration files
     * that indicate the use of development tools or frameworks. Provides
     * suggestions when tool configurations are detected without corresponding traits.
     *
     * Detection Process:
     * 1. Check if trait is already active
     * 2. Verify configuration helper is available
     * 3. Search for any of the specified configuration files
     * 4. Generate suggestion with tool-specific messaging
     *
     * @param {string} traitName - Name of the trait to suggest
     * @param {Array<string>} configFiles - Array of configuration file names to search for
     * @param {string} message - Custom suggestion message (optional)
     * @returns {boolean} True if trait was suggested based on configuration files
     */
    suggestTraitByConfig(traitName, configFiles, message = null) {
        // === PREREQUISITE CHECKS ===
        if (this.hasActiveTrait(traitName) || !this.configHelper) {
            return false;
        }

        // === CONFIGURATION FILE DETECTION ===
        const hasConfig = this.configHelper.hasAnyConfig(configFiles);

        if (hasConfig) {
            // === CONTEXTUAL MESSAGING ===
            const defaultMessage = `${traitName} configuration detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
            logInfo(message || defaultMessage);
            return true;
        }

        return false;
    }

    /*
    ============================================================================
    MULTI-DIMENSIONAL TRAIT SUGGESTIONS
    ============================================================================
    */

    /**
     * Suggest traits based on combined dependency and configuration analysis
     *
     * Provides robust trait detection by examining both package dependencies
     * and configuration files. This approach catches frameworks and tools
     * regardless of how they were installed or configured, providing
     * comprehensive coverage for trait suggestions.
     *
     * Detection Logic:
     * - OR relationship: Either dependencies OR configuration files trigger suggestion
     * - Comprehensive coverage: Catches tools installed via different methods
     * - Flexible detection: Adapts to different project setup patterns
     *
     * @param {string} traitName - Name of the trait to suggest
     * @param {Array<string>} dependencies - Array of package names to search for
     * @param {Array<string>} configFiles - Array of configuration file names to search for
     * @param {string} message - Custom suggestion message (optional)
     * @returns {boolean} True if trait was suggested based on either detection method
     */
    suggestTraitByDependencyOrConfig(traitName, dependencies, configFiles, message = null) {
        // === ACTIVE TRAIT FILTERING ===
        if (this.hasActiveTrait(traitName)) {
            return false;
        }

        // === MULTI-DIMENSIONAL DETECTION ===
        const hasDeps = this.packageHelper && this.packageHelper.hasAnyDependency(dependencies);
        const hasConfig = this.configHelper && this.configHelper.hasAnyConfig(configFiles);

        if (hasDeps || hasConfig) {
            // === CONTEXTUAL MESSAGING ===
            const defaultMessage = `${traitName} detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
            logInfo(message || defaultMessage);
            return true;
        }

        return false;
    }

    /*
    ============================================================================
    FRAMEWORK TRAIT SUGGESTION SYSTEM
    ============================================================================
    */

    /**
     * Comprehensive framework trait suggestions with predefined detection patterns
     *
     * Analyzes the repository for popular JavaScript/TypeScript frameworks and
     * suggests appropriate traits for enhanced setup validation. Uses carefully
     * curated detection patterns for accurate framework identification.
     *
     * Supported Frameworks:
     * - React: React applications and libraries
     * - Vue.js: Vue applications and single-file components
     * - Express.js: Node.js web application framework
     * - Next.js: React-based full-stack framework
     * - Angular: TypeScript-based application platform (extensible)
     *
     * Detection Strategy:
     * - Primary package detection for core framework libraries
     * - TypeScript variant detection for enhanced coverage
     * - CLI tool detection for development environment identification
     *
     * @returns {Array<string>} Array of suggested framework trait names
     */
    suggestFrameworkTraits() {
        // === FRAMEWORK DETECTION MATRIX ===
        const frameworkChecks = [
            {
                trait: 'react',
                deps: ['react', '@types/react', 'react-dom', '@types/react-dom'],
                configs: [], // React typically doesn't have specific config files
                message: `React dependencies detected. Consider adding ${chalk.cyan('react')} trait for enhanced React validation and setup.`
            },
            {
                trait: 'vue',
                deps: ['vue', '@vue/cli', '@vue/cli-service', 'vue-router', 'vuex'],
                configs: ['vue.config.js', '.vuerc'],
                message: `Vue.js dependencies detected. Consider adding ${chalk.cyan('vue')} trait for enhanced Vue validation and tooling.`
            },
            {
                trait: 'express',
                deps: ['express', '@types/express', 'express-generator'],
                configs: [], // Express uses programmatic configuration
                message: `Express.js dependencies detected. Consider adding ${chalk.cyan('express')} trait for enhanced Express validation.`
            },
            {
                trait: 'nextjs',
                deps: ['next', '@next/bundle-analyzer', '@next/eslint-plugin'],
                configs: ['next.config.js', 'next.config.mjs'],
                message: `Next.js dependencies detected. Consider adding ${chalk.cyan('nextjs')} trait for enhanced Next.js validation and optimization.`
            },
            {
                trait: 'angular',
                deps: ['@angular/core', '@angular/cli', '@angular/common'],
                configs: ['angular.json', '.angular-cli.json'],
                message: `Angular dependencies detected. Consider adding ${chalk.cyan('angular')} trait for enhanced Angular validation.`
            },
            {
                trait: 'svelte',
                deps: ['svelte', '@sveltejs/kit', 'svelte-preprocess'],
                configs: ['svelte.config.js'],
                message: `Svelte dependencies detected. Consider adding ${chalk.cyan('svelte')} trait for enhanced Svelte validation.`
            }
        ];

        // === SUGGESTION PROCESSING ===
        const suggestions = [];
        frameworkChecks.forEach(({ trait, deps, configs, message }) => {
            if (this.suggestTraitByDependencyOrConfig(trait, deps, configs, message)) {
                suggestions.push(trait);
            }
        });

        if (suggestions.length > 0) {
            logInfo(`Suggested ${suggestions.length} framework trait(s): ${suggestions.join(', ')}`);
        }

        return suggestions;
    }

    /*
    ============================================================================
    DEVELOPMENT TOOL TRAIT SUGGESTION SYSTEM
    ============================================================================
    */

    /**
     * Comprehensive development tool trait suggestions with specialized detection
     *
     * Analyzes the repository for common development tools and build systems,
     * suggesting traits that provide enhanced validation and setup automation
     * for detected tools. Covers linting, formatting, testing, and build tools.
     *
     * Supported Tool Categories:
     * - Language Tools: TypeScript, Babel
     * - Code Quality: ESLint, Prettier, Stylelint
     * - Testing Frameworks: Jest, Mocha, Cypress
     * - Build Systems: Webpack, Vite, Rollup, Parcel
     * - Development Servers: Nodemon, Concurrently
     *
     * Detection Strategy:
     * - Package dependency scanning for tool installations
     * - Configuration file detection for tool setups
     * - Combined detection for comprehensive coverage
     * - Version-agnostic detection patterns
     *
     * @returns {Array<string>} Array of suggested tool trait names
     */
    suggestToolTraits() {
        // === DEVELOPMENT TOOL DETECTION MATRIX ===
        const toolChecks = [
            {
                trait: 'typescript',
                deps: ['typescript', '@types/node', 'ts-node', 'ts-loader'],
                configs: ['tsconfig.json', 'tsconfig.build.json', 'tsconfig.spec.json'],
                message: `TypeScript detected. Consider adding ${chalk.cyan('typescript')} trait for enhanced TypeScript validation and compilation.`
            },
            {
                trait: 'eslint',
                deps: ['eslint', '@typescript-eslint/parser', '@typescript-eslint/eslint-plugin'],
                configs: ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', '.eslintrc.yml', 'eslint.config.js'],
                message: `ESLint detected. Consider adding ${chalk.cyan('eslint')} trait for enhanced code quality validation.`
            },
            {
                trait: 'prettier',
                deps: ['prettier', 'eslint-config-prettier', 'eslint-plugin-prettier'],
                configs: ['.prettierrc', '.prettierrc.json', '.prettierrc.yaml', '.prettierrc.yml', 'prettier.config.js'],
                message: `Prettier detected. Consider adding ${chalk.cyan('prettier')} trait for enhanced code formatting validation.`
            },
            {
                trait: 'jest',
                deps: ['jest', '@types/jest', 'jest-environment-jsdom', 'ts-jest'],
                configs: ['jest.config.js', 'jest.config.json', 'jest.config.ts', 'jest.config.mjs'],
                message: `Jest detected. Consider adding ${chalk.cyan('jest')} trait for enhanced testing validation and setup.`
            },
            {
                trait: 'webpack',
                deps: ['webpack', 'webpack-cli', 'webpack-dev-server', 'webpack-merge'],
                configs: ['webpack.config.js', 'webpack.config.ts', 'webpack.dev.js', 'webpack.prod.js'],
                message: `Webpack detected. Consider adding ${chalk.cyan('webpack')} trait for enhanced build validation and optimization.`
            },
            {
                trait: 'vite',
                deps: ['vite', '@vitejs/plugin-react', '@vitejs/plugin-vue'],
                configs: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
                message: `Vite detected. Consider adding ${chalk.cyan('vite')} trait for enhanced build validation and development server setup.`
            },
            {
                trait: 'babel',
                deps: ['@babel/core', '@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
                configs: ['babel.config.js', 'babel.config.json', '.babelrc', '.babelrc.js'],
                message: `Babel detected. Consider adding ${chalk.cyan('babel')} trait for enhanced transpilation validation.`
            },
            {
                trait: 'rollup',
                deps: ['rollup', '@rollup/plugin-node-resolve', '@rollup/plugin-commonjs'],
                configs: ['rollup.config.js', 'rollup.config.ts', 'rollup.config.mjs'],
                message: `Rollup detected. Consider adding ${chalk.cyan('rollup')} trait for enhanced bundling validation.`
            },
            {
                trait: 'docker',
                deps: [], // Docker is typically not a package dependency
                configs: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
                message: `Docker configuration detected. Consider adding ${chalk.cyan('docker')} trait for enhanced containerization validation.`
            }
        ];

        // === SUGGESTION PROCESSING ===
        const suggestions = [];
        toolChecks.forEach(({ trait, deps, configs, message }) => {
            if (this.suggestTraitByDependencyOrConfig(trait, deps, configs, message)) {
                suggestions.push(trait);
            }
        });

        if (suggestions.length > 0) {
            logInfo(`Suggested ${suggestions.length} tool trait(s): ${suggestions.join(', ')}`);
        }

        return suggestions;
    }

    /*
    ============================================================================
    COMPREHENSIVE TRAIT ANALYSIS SYSTEM
    ============================================================================
    */

    /**
     * Execute comprehensive trait analysis across all categories
     *
     * Performs a complete repository analysis to identify all potential
     * trait suggestions across frameworks, tools, and other categories.
     * Provides a single entry point for comprehensive trait recommendation.
     *
     * Analysis Categories:
     * 1. Framework Traits: React, Vue, Express, Next.js, etc.
     * 2. Tool Traits: TypeScript, ESLint, Jest, Webpack, etc.
     * 3. Platform Traits: Docker, Node.js, etc. (extensible)
     *
     * Returns consolidated suggestions with categorization for
     * comprehensive trait recommendation reporting.
     *
     * @returns {Object} Comprehensive suggestion results with categorization
     */
    suggestAllMissingTraits() {
        logInfo('Starting comprehensive trait analysis...');

        // === FRAMEWORK ANALYSIS ===
        const frameworkSuggestions = this.suggestFrameworkTraits();

        // === TOOL ANALYSIS ===
        const toolSuggestions = this.suggestToolTraits();

        // === RESULTS COMPILATION ===
        const allSuggestions = [...frameworkSuggestions, ...toolSuggestions];

        // === COMPREHENSIVE REPORTING ===
        if (allSuggestions.length > 0) {
            logInfo(`Trait analysis complete: ${allSuggestions.length} total suggestions generated`);
            logInfo(`Framework suggestions: ${frameworkSuggestions.length}`);
            logInfo(`Tool suggestions: ${toolSuggestions.length}`);
        } else {
            logInfo('Trait analysis complete: No additional traits recommended');
        }

        // === STRUCTURED RESULTS ===
        return {
            all: allSuggestions,
            frameworks: frameworkSuggestions,
            tools: toolSuggestions,
            total: allSuggestions.length
        };
    }

    /*
    ============================================================================
    UTILITY AND INTROSPECTION METHODS
    ============================================================================
    */

    /**
     * Get list of currently active traits
     *
     * @returns {Array<string>} Array of active trait names
     */
    getActiveTraits() {
        return [...this.activeTraits]; // Return copy to prevent external modification
    }

    /**
     * Get count of active traits
     *
     * @returns {number} Number of currently active traits
     */
    getActiveTraitCount() {
        return this.activeTraits.length;
    }

    /**
     * Check if any helper is available for analysis
     *
     * @returns {boolean} True if at least one analysis helper is available
     */
    hasAnalysisCapability() {
        return !!(this.packageHelper || this.configHelper || this.directoryHelper);
    }

    /**
     * Get available analysis capabilities
     *
     * @returns {Object} Object indicating which analysis helpers are available
     */
    getAnalysisCapabilities() {
        return {
            packageAnalysis: !!this.packageHelper,
            configAnalysis: !!this.configHelper,
            directoryAnalysis: !!this.directoryHelper
        };
    }
}