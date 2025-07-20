import {PackageJsonHelper} from './package-json-helper.js';
import {ConfigFileHelper} from './config-file-helper.js';
import {DirectoryHelper} from './directory-helper.js';
import {TraitAdviser} from './trait-adviser.js';
import {defaultLogger, logInfo} from './logger.js';
import chalk from 'chalk';

export class BaseTraitChecker {
    constructor(context, traitName) {
        this.setContext(context);
        this.traitName = traitName;
    }

    /**
     * Set context and initialize helpers
     */
    setContext(context) {
        // Use logger from context if available, fallback to default Logger
        this.logger = context?.logger || this.logger || defaultLogger;

        this.cwd = context?.cwd || this.context?.cwd || process.cwd();
        this.traits = this.normalizeTraits(context?.repo?.traits ||this.context?.repo?.traits || []);

        // (Re)Initialize helpers
        this.packageHelper = new PackageJsonHelper(this.cwd);
        this.configHelper = new ConfigFileHelper(this.cwd);
        this.directoryHelper = new DirectoryHelper(this.cwd);
        this.adviser = new TraitAdviser(
            this.traits,
            this.packageHelper,
            this.configHelper,
            this.directoryHelper
        );
    }

    /**
     * Normalize traits to array
     */
    normalizeTraits(traits) {
        return Array.isArray(traits) ? traits : (traits ? [traits] : []);
    }

    /**
     * Main check method - template method pattern
     */
    async check(context) {
        if (context || !this.context) {
            this.setContext(context)
        }
        await this.validateCore();
        await this.validateConfiguration();
        await this.validateDependencies();
        await this.validateStructure();
        await this.provideSuggestions();
    }

    /**
     * Abstract methods to be implemented by subclasses
     */
    async validateCore() {
        throw new Error(`${this.traitName} trait must implement validateCore() method`);
    }

    async validateConfiguration() {
        // Optional override
    }

    async validateDependencies() {
        // Optional override
    }

    async validateStructure() {
        // Optional override
    }

    async provideSuggestions() {
        // Optional override
    }

    /**
     * Common utility methods
     */
    logSecuritySuggestions() {
        if (this.packageHelper.packageJson?.dependencies || this.packageHelper.packageJson?.devDependencies) {
            this.logger.info(`Run ${chalk.cyan('npm audit')} to check for known security vulnerabilities.`);
            this.logger.info(`Run ${chalk.cyan('npm outdated')} to check for package updates.`);
        }
    }

    /**
     * Helper to suggest trait if not active
     */
    suggestTraitIfMissing(traitName, detectionLogic, message) {
        if (!this.traits.includes(traitName) && detectionLogic()) {
            this.logger.info(message);
        }
    }

    /**
     * Get current working directory
     */
    getCwd() {
        return this.cwd;
    }

    /**
     * Check if trait is active
     */
    isTraitActive(traitName) {
        return this.traits.includes(traitName);
    }
}