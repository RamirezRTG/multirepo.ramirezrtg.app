/*
================================================================================
File: scripts/helper/base-trait-checker.js (Abstract Trait Validation Framework)
Description: Foundational base class for trait-based repository validation system.
             Implements the Template Method pattern to provide a standardized
             validation workflow while allowing specialized trait implementations
             to customize specific validation steps. Serves as the architectural
             foundation for all trait checkers in the multirepo setup orchestrator.

Key Responsibilities:
- Template Method pattern implementation for consistent validation workflows
- Helper class integration and lifecycle management
- Context management and state propagation across validation phases
- Abstract method definitions for trait-specific validation logic
- Common utility methods for cross-trait functionality
- Trait relationship management and suggestion logic
- Security and maintenance recommendation generation

Validation Workflow (Template Method Pattern):
1. validateCore() - Core trait-specific validation (abstract)
2. validateConfiguration() - Configuration file validation (optional)
3. validateDependencies() - Dependency and package validation (optional)
4. validateStructure() - Directory and file structure validation (optional)
5. provideSuggestions() - Enhancement and optimization suggestions (optional)

Helper Integration:
- PackageJsonHelper: Package.json analysis and dependency management
- ConfigFileHelper: Configuration file detection and validation
- DirectoryHelper: File system structure analysis
- TraitAdviser: Intelligent trait recommendation system
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// Specialized helper classes for comprehensive repository analysis
import { PackageJsonHelper } from './package-json-helper.js';
import { ConfigFileHelper } from './config-file-helper.js';
import { DirectoryHelper } from './directory-helper.js';
import { TraitAdviser } from './trait-adviser.js';
// Logging system for validation feedback and progress reporting
import { defaultLogger, logInfo } from './logger.js';
// Terminal styling for enhanced visual feedback
import chalk from 'chalk';

/*
================================================================================
ABSTRACT TRAIT VALIDATION FRAMEWORK
================================================================================
*/

/**
 * Abstract Base Class for Trait-Based Repository Validation
 *
 * This class implements a sophisticated validation framework using the Template
 * Method design pattern to provide consistent validation workflows across all
 * trait implementations. It manages helper class lifecycles, context propagation,
 * and provides a standardized API for trait-specific validation logic.
 *
 * Architecture Principles:
 * - Template Method Pattern: Defines validation workflow skeleton
 * - Helper Integration: Manages lifecycle of specialized analysis helpers
 * - Context Management: Propagates execution context across validation phases
 * - Extensibility: Provides hooks for trait-specific customization
 * - Consistency: Ensures uniform validation experience across traits
 * - Reusability: Common functionality shared across all trait implementations
 *
 * Validation Phases:
 * 1. Core Validation: Trait-specific essential checks (required)
 * 2. Configuration Validation: Config file analysis (optional)
 * 3. Dependency Validation: Package and library checks (optional)
 * 4. Structure Validation: File system organization checks (optional)
 * 5. Suggestion Generation: Enhancement recommendations (optional)
 *
 * Helper Classes Managed:
 * - PackageJsonHelper: npm/yarn package analysis
 * - ConfigFileHelper: Configuration file detection
 * - DirectoryHelper: File system structure analysis
 * - TraitAdviser: Cross-trait recommendation engine
 */
export class BaseTraitChecker {
    /**
     * Initialize base trait checker with context and trait identification
     *
     * Creates a new trait checker instance with the provided execution context
     * and trait name. Initializes all helper classes and establishes the
     * foundation for the validation workflow.
     *
     * @param {Object} context - Execution context with repository and environment data
     * @param {string} traitName - Name of the specific trait being validated
     */
    constructor(context, traitName) {
        // === TRAIT IDENTIFICATION ===
        this.traitName = traitName;

        // === CONTEXT INITIALIZATION ===
        this.setContext(context);

        logInfo(`Base trait checker initialized for trait: ${chalk.cyan(traitName)}`);
    }

    /*
    ============================================================================
    CONTEXT MANAGEMENT AND HELPER INITIALIZATION
    ============================================================================
    */

    /**
     * Comprehensive context setup with helper class lifecycle management
     *
     * Establishes or updates the execution context for the trait checker,
     * including working directory, repository configuration, and active traits.
     * Initializes or reinitializes all helper classes with the current context.
     *
     * Context Components:
     * - Working Directory: Base path for all file system operations
     * - Repository Configuration: Trait list and repository metadata
     * - Logger Instance: Contextual logging with proper configuration
     * - Helper Classes: Specialized analysis tools for different aspects
     *
     * @param {Object} context - New or updated execution context
     */
    setContext(context) {
        // === LOGGER CONFIGURATION ===
        // Use context logger if available, maintain existing logger as fallback
        this.logger = context?.logger || this.logger || defaultLogger;

        // === WORKING DIRECTORY ESTABLISHMENT ===
        // Resolve working directory from context with fallback chain
        this.cwd = context?.cwd || this.context?.cwd || process.cwd();

        // === TRAIT CONFIGURATION EXTRACTION ===
        // Extract and normalize active traits from repository configuration
        const rawTraits = context?.repo?.traits || this.context?.repo?.traits || [];
        this.traits = this.normalizeTraits(rawTraits);

        // === REPOSITORY CONTEXT PRESERVATION ===
        // Store complete context for future reference and helper initialization
        this.context = context;

        // === HELPER CLASS LIFECYCLE MANAGEMENT ===
        // Initialize or reinitialize all helper classes with current context
        this.initializeHelpers();

        this.logger.info(`Context updated for ${this.traitName} trait checker`);
        this.logger.info(`Working directory: ${this.cwd}`);
        this.logger.info(`Active traits: ${this.traits.length > 0 ? this.traits.join(', ') : 'none'}`);
    }

    /**
     * Initialize all helper classes with current context
     *
     * Creates fresh instances of all helper classes with the current working
     * directory and context. This ensures all helpers have consistent state
     * and are properly configured for the current validation run.
     */
    initializeHelpers() {
        // === PACKAGE ANALYSIS HELPER ===
        // Specialized helper for package.json analysis and dependency management
        this.packageHelper = new PackageJsonHelper(this.cwd);

        // === CONFIGURATION FILE HELPER ===
        // Specialized helper for configuration file detection and validation
        this.configHelper = new ConfigFileHelper(this.cwd);

        // === DIRECTORY STRUCTURE HELPER ===
        // Specialized helper for file system structure analysis
        this.directoryHelper = new DirectoryHelper(this.cwd);

        // === TRAIT RECOMMENDATION ENGINE ===
        // Intelligent system for suggesting additional relevant traits
        this.adviser = new TraitAdviser(
            this.traits,
            this.packageHelper,
            this.configHelper,
            this.directoryHelper
        );

        this.logger.info('All helper classes initialized successfully');
    }

    /**
     * Normalize trait configuration to consistent array format
     *
     * Ensures that trait configuration is always in array format for
     * consistent processing, regardless of how it was specified in
     * the repository configuration.
     *
     * @param {string|Array<string>} traits - Raw trait configuration
     * @returns {Array<string>} Normalized array of trait names
     */
    normalizeTraits(traits) {
        if (Array.isArray(traits)) {
            return traits;
        } else if (traits) {
            return [traits];
        } else {
            return [];
        }
    }

    /*
    ============================================================================
    TEMPLATE METHOD PATTERN IMPLEMENTATION
    ============================================================================
    */

    /**
     * Main validation orchestration method implementing Template Method pattern
     *
     * This is the primary entry point for trait validation, implementing a
     * standardized workflow that calls specific validation methods in a
     * defined order. Each method can be overridden by subclasses to provide
     * trait-specific validation logic while maintaining workflow consistency.
     *
     * Validation Workflow:
     * 1. Context setup and validation
     * 2. Core trait validation (required)
     * 3. Configuration file validation (optional)
     * 4. Dependency analysis and validation (optional)
     * 5. Directory structure validation (optional)
     * 6. Enhancement suggestions (optional)
     *
     * @param {Object} context - Execution context (optional if already set)
     */
    async check(context) {
        // === CONTEXT MANAGEMENT ===
        // Update context if provided or if no context exists
        if (context || !this.context) {
            this.setContext(context);
        }

        this.logger.info(`Starting comprehensive validation for ${chalk.cyan(this.traitName)} trait`);

        try {
            // === VALIDATION PHASE EXECUTION ===
            // Execute each validation phase in the defined order

            await this.validateCore();
            this.logger.info(`Core validation completed for ${this.traitName}`);

            await this.validateConfiguration();
            this.logger.info(`Configuration validation completed for ${this.traitName}`);

            await this.validateDependencies();
            this.logger.info(`Dependency validation completed for ${this.traitName}`);

            await this.validateStructure();
            this.logger.info(`Structure validation completed for ${this.traitName}`);

            await this.provideSuggestions();
            this.logger.info(`Suggestions generated for ${this.traitName}`);

            // === COMPLETION REPORTING ===
            this.logger.success(`All validation phases completed successfully for ${chalk.cyan(this.traitName)} trait`);

        } catch (error) {
            // === ERROR HANDLING ===
            this.logger.error(`Validation failed for ${this.traitName} trait: ${error.message}`);
            throw error;
        }
    }

    /*
    ============================================================================
    ABSTRACT VALIDATION METHODS (TEMPLATE METHOD HOOKS)
    ============================================================================
    */

    /**
     * Core trait validation (ABSTRACT - must be implemented by subclasses)
     *
     * This is the primary validation method that must be implemented by all
     * trait subclasses. It should contain the essential validation logic
     * that defines whether the trait's requirements are met.
     *
     * Implementation Requirements:
     * - Must be implemented by all subclasses
     * - Should validate core trait requirements
     * - Should throw descriptive errors for validation failures
     * - Should use this.logger for consistent output
     *
     * @throws {Error} Must be implemented by subclasses
     */
    async validateCore() {
        throw new Error(
            `${this.traitName} trait must implement validateCore() method. ` +
            `This method should contain the primary validation logic for the trait.`
        );
    }

    /**
     * Configuration file validation (OPTIONAL - can be overridden by subclasses)
     *
     * Hook method for validating trait-specific configuration files.
     * Default implementation does nothing, allowing traits that don't
     * require configuration validation to skip this phase.
     *
     * Common Implementation Patterns:
     * - Check for required configuration files
     * - Validate configuration file syntax and structure
     * - Verify configuration completeness and correctness
     * - Report missing or invalid configurations
     */
    async validateConfiguration() {
        // Default implementation: no configuration validation
        // Subclasses can override to provide specific configuration checks
    }

    /**
     * Dependency validation (OPTIONAL - can be overridden by subclasses)
     *
     * Hook method for validating trait-specific dependencies and packages.
     * Default implementation does nothing, allowing traits that don't
     * require dependency validation to skip this phase.
     *
     * Common Implementation Patterns:
     * - Check for required npm/yarn packages
     * - Validate package versions and compatibility
     * - Verify development vs production dependency placement
     * - Check for conflicting or duplicate dependencies
     */
    async validateDependencies() {
        // Default implementation: no dependency validation
        // Subclasses can override to provide specific dependency checks
    }

    /**
     * Directory structure validation (OPTIONAL - can be overridden by subclasses)
     *
     * Hook method for validating trait-specific directory and file structures.
     * Default implementation does nothing, allowing traits that don't
     * require structure validation to skip this phase.
     *
     * Common Implementation Patterns:
     * - Check for required directories (src/, test/, docs/, etc.)
     * - Validate file naming conventions
     * - Verify project organization standards
     * - Check for required files (README, LICENSE, etc.)
     */
    async validateStructure() {
        // Default implementation: no structure validation
        // Subclasses can override to provide specific structure checks
    }

    /**
     * Enhancement suggestions (OPTIONAL - can be overridden by subclasses)
     *
     * Hook method for providing trait-specific enhancement suggestions.
     * Default implementation does nothing, allowing traits that don't
     * provide suggestions to skip this phase.
     *
     * Common Implementation Patterns:
     * - Suggest complementary traits
     * - Recommend best practices
     * - Identify optimization opportunities
     * - Provide security and maintenance suggestions
     */
    async provideSuggestions() {
        // Default implementation: no suggestions
        // Subclasses can override to provide specific enhancement suggestions
    }

    /*
    ============================================================================
    COMMON UTILITY METHODS FOR TRAIT IMPLEMENTATIONS
    ============================================================================
    */

    /**
     * Generate standard security and maintenance recommendations
     *
     * Provides common security and maintenance suggestions that apply
     * to most Node.js projects with package dependencies. This utility
     * method can be called by trait implementations to provide consistent
     * security guidance.
     *
     * Recommendations Include:
     * - npm audit for security vulnerability scanning
     * - npm outdated for package update identification
     * - Version pinning and lock file maintenance
     */
    logSecuritySuggestions() {
        // === DEPENDENCY EXISTENCE CHECK ===
        const hasPackages = this.packageHelper.packageJson?.dependencies ||
            this.packageHelper.packageJson?.devDependencies;

        if (hasPackages) {
            this.logger.info('Security and Maintenance Recommendations:');
            this.logger.info(`  Run ${chalk.cyan('npm audit')} to check for known security vulnerabilities`);
            this.logger.info(`  Run ${chalk.cyan('npm outdated')} to check for available package updates`);
            this.logger.info(`  Consider using ${chalk.cyan('npm audit fix')} to automatically fix vulnerabilities`);
            this.logger.info(`  Regularly update dependencies to receive security patches`);
        }
    }

    /**
     * Conditional trait suggestion with custom detection logic
     *
     * Utility method for suggesting additional traits based on custom
     * detection logic. Only suggests traits that are not already active
     * and meet the specified detection criteria.
     *
     * @param {string} traitName - Name of the trait to potentially suggest
     * @param {Function} detectionLogic - Function returning boolean for detection
     * @param {string} message - Suggestion message to display
     */
    suggestTraitIfMissing(traitName, detectionLogic, message) {
        try {
            // === ACTIVE TRAIT FILTERING ===
            if (this.traits.includes(traitName)) {
                return; // Trait already active, no suggestion needed
            }

            // === DETECTION LOGIC EXECUTION ===
            const shouldSuggest = detectionLogic();

            if (shouldSuggest) {
                this.logger.info(`Trait Suggestion: ${message}`);
            }
        } catch (error) {
            this.logger.warn(`Trait suggestion detection failed for ${traitName}: ${error.message}`);
        }
    }

    /*
    ============================================================================
    CONTEXT INSPECTION AND UTILITY METHODS
    ============================================================================
    */

    /**
     * Get the current working directory
     *
     * @returns {string} Absolute path of the current working directory
     */
    getCwd() {
        return this.cwd;
    }

    /**
     * Check if a specific trait is currently active
     *
     * @param {string} traitName - Name of the trait to check
     * @returns {boolean} True if the trait is active
     */
    isTraitActive(traitName) {
        return this.traits.includes(traitName);
    }

    /**
     * Get list of all active traits
     *
     * @returns {Array<string>} Array of active trait names
     */
    getActiveTraits() {
        return [...this.traits]; // Return copy to prevent external modification
    }

    /**
     * Get the trait name being validated
     *
     * @returns {string} Name of the current trait
     */
    getTraitName() {
        return this.traitName;
    }

    /**
     * Get the current execution context
     *
     * @returns {Object} Current execution context object
     */
    getContext() {
        return this.context;
    }

    /**
     * Check if all helper classes are properly initialized
     *
     * @returns {boolean} True if all helpers are available
     */
    areHelpersInitialized() {
        return !!(this.packageHelper &&
            this.configHelper &&
            this.directoryHelper &&
            this.adviser);
    }

    /**
     * Get comprehensive trait checker status information
     *
     * @returns {Object} Status object with checker state information
     */
    getStatus() {
        return {
            traitName: this.traitName,
            workingDirectory: this.cwd,
            activeTraits: this.traits,
            helpersInitialized: this.areHelpersInitialized(),
            contextAvailable: !!this.context
        };
    }
}