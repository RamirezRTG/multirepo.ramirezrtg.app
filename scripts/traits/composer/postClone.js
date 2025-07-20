import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import { ConfigFileHelper } from '../../helper/config-file-helper.js';
import { logInfo, logSuccess, logWarn } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class ComposerTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'composer');
        // Initialize composer helper for JSON operations
        this.composerHelper = new ComposerJsonHelper(this.cwd);
    }

    async validateCore() {
        // Require composer.json
        this.configHelper.requireFile('composer.json', 'This is required for PHP Composer projects.');

        // Validate and parse composer.json using the composer helper
        const composerJson = this.composerHelper.getComposerJson();
        this.validateComposerFields(composerJson);
    }

    async validateDependencies() {
        // Check composer.lock
        this.validateComposerLock();

        // Check vendor directory
        this.validateVendorDirectory();
    }

    async validateConfiguration() {
        // Check .gitignore for Composer
        this.configHelper.validateGitignore(['vendor/'], 'Composer');
    }

    async provideSuggestions() {
        if (this.configHelper.hasFile('vendor/composer/installed.json')) {
            this.logger.info(`Run ${chalk.cyan('composer audit')} to check for known security vulnerabilities.`);
        }
    }

    /**
     * Validate composer.json fields
     */
    validateComposerFields(composerJson) {
        if (!composerJson) return;

        if (!composerJson.name) {
            this.logger.warn(`${chalk.white('composer.json')} is missing the ${chalk.cyan('name')} field.`);
        }

        if (!composerJson.description) {
            this.logger.info(`${chalk.white('composer.json')} could benefit from a ${chalk.cyan('description')} field.`);
        }

        // Check autoload configuration
        if (!composerJson.autoload && !composerJson['autoload-dev']) {
            this.logger.warn(`${chalk.white('composer.json')} has no autoload configuration. Consider adding ${chalk.cyan('autoload')} section.`);
        } else {
            this.logger.success(`Autoload configuration found in ${chalk.white('composer.json')}.`);
        }

        // Check PHP version requirement
        if (composerJson.require?.php) {
            this.logger.info(`PHP version requirement found: ${chalk.cyan(composerJson.require.php)}`);
        }
    }

    /**
     * Validate composer.lock
     */
    validateComposerLock() {
        if (!this.configHelper.hasFile('composer.lock')) {
            this.logger.warn(`${chalk.white('composer.lock')} file not found. Run ${chalk.cyan('composer install')} to generate lock file and install dependencies.`);
        } else {
            this.logger.success(`${chalk.white('composer.lock')} found.`);
        }
    }

    /**
     * Validate vendor directory
     */
    validateVendorDirectory() {
        const hasVendor = this.directoryHelper.checkDirectory(
            'vendor',
            `${chalk.white('vendor')} directory found with dependencies installed.`,
            `${chalk.white('vendor')} directory not found. Run ${chalk.cyan('composer install')} to install dependencies.`,
            `${chalk.white('vendor')} directory is empty. Run ${chalk.cyan('composer install')} to install dependencies.`
        );

        if (hasVendor) {
            // Check for composer-specific files
            this.validateComposerFiles();
        }
    }

    /**
     * Validate Composer-specific files
     */
    validateComposerFiles() {
        // Check for autoload.php
        if (this.configHelper.hasFile('vendor/autoload.php')) {
            this.logger.success(`Composer autoload file ${chalk.white('vendor/autoload.php')} is available.`);

            // Check for related autoload files
            const autoloadFiles = [
                'vendor/composer/autoload_real.php',
                'vendor/composer/autoload_classmap.php',
                'vendor/composer/autoload_psr4.php'
            ];

            autoloadFiles.forEach(file => {
                if (this.configHelper.hasFile(file)) {
                    this.logger.success(`Autoload file ${chalk.white(file)} found.`);
                }
            });
        } else {
            this.logger.warn(`${chalk.white('vendor/autoload.php')} not found. Dependencies may not be properly installed.`);
        }

        // Check for installed.json
        if (this.configHelper.hasFile('vendor/composer/installed.json')) {
            this.logger.success(`Package registry ${chalk.white('vendor/composer/installed.json')} found.`);
        }
    }
}

// Composer JSON helper class (now properly used)
class ComposerJsonHelper {
    constructor(cwd) {
        this.cwd = cwd;
        this.configHelper = new ConfigFileHelper(cwd);
    }

    /**
     * Get and validate composer.json content
     */
    getComposerJson() {
        return this.configHelper.validateJsonFile('composer.json');
    }

    /**
     * Check if composer.json has specific dependency
     */
    hasDependency(packageName, type = 'require') {
        const composerJson = this.getComposerJson();
        return composerJson?.[type]?.[packageName] !== undefined;
    }

    /**
     * Get composer.json scripts
     */
    getScripts() {
        const composerJson = this.getComposerJson();
        return composerJson?.scripts || {};
    }

    /**
     * Check if composer.json has autoload configuration
     */
    hasAutoload() {
        const composerJson = this.getComposerJson();
        return !!(composerJson?.autoload || composerJson?.['autoload-dev']);
    }
}

export function check(context) {
    const checker = new ComposerTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}