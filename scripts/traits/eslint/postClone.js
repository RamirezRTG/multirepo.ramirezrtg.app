import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import { logInfo } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class ESLintTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'eslint');
    }

    async validateCore() {
        // Require ESLint configuration
        const eslintConfigs = [
            '.eslintrc.js',
            '.eslintrc.json',
            '.eslintrc.yaml',
            '.eslintrc.yml',
            'eslint.config.js'
        ];

        this.configHelper.requireOneOfConfigs(eslintConfigs, 'ESLint');
    }

    async validateDependencies() {
        const hasESLint = this.packageHelper.hasDependency('eslint');
        if (hasESLint) {
            this.logger.info(`ESLint dependency found in ${chalk.white('package.json')}.`);
        } else {
            this.logger.warn('ESLint dependency not found. Consider adding eslint to devDependencies.');
        }

        // Check for ESLint scripts
        const lintScripts = this.packageHelper.findScripts('lint');
        if (lintScripts.length > 0) {
            this.logger.info(`ESLint scripts found: ${lintScripts.map(s => chalk.cyan(s)).join(', ')}`);
        } else {
            this.logger.info(`Consider adding lint scripts like ${chalk.cyan('"lint": "eslint ."')} to package.json.`);
        }
    }

    async validateConfiguration() {
        // Check for .eslintignore
        this.configHelper.checkOptionalFile('.eslintignore',
            `${chalk.white('.eslintignore')} file found.`,
            `Consider adding a ${chalk.white('.eslintignore')} file to exclude certain files from linting.`
        );
    }

    async provideSuggestions() {
        this.logger.info(`Run ${chalk.cyan('eslint .')} to check for linting issues.`);
    }
}

export function check(context) {
    const checker = new ESLintTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}