import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import { logInfo } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class PrettierTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'prettier');
    }

    async validateCore() {
        // Prettier config is optional, suggest if missing
        const prettierConfigs = [
            '.prettierrc',
            '.prettierrc.json',
            '.prettierrc.yaml',
            '.prettierrc.yml',
            'prettier.config.js'
        ];

        this.configHelper.suggestConfigIfMissing(prettierConfigs, 'Prettier');
    }

    async validateDependencies() {
        const hasPrettier = this.packageHelper.hasDependency('prettier');
        if (hasPrettier) {
            this.logger.info(`Prettier dependency found in ${chalk.white('package.json')}.`);
        } else {
            this.logger.warn('Prettier dependency not found. Consider adding prettier to devDependencies.');
        }

        // Check for Prettier scripts
        const formatScripts = this.packageHelper.findScripts('format');
        if (formatScripts.length > 0) {
            this.logger.info(`Prettier scripts found: ${formatScripts.map(s => chalk.cyan(s)).join(', ')}`);
        } else {
            this.logger.info(`Consider adding format scripts like ${chalk.cyan('"format": "prettier --write ."')} to package.json.`);
        }
    }

    async validateConfiguration() {
        // Check for .prettierignore
        this.configHelper.checkOptionalFile('.prettierignore',
            `${chalk.white('.prettierignore')} file found.`,
            `Consider adding a ${chalk.white('.prettierignore')} file to exclude certain files from formatting.`
        );
    }

    async provideSuggestions() {
        this.logger.info(`Run ${chalk.cyan('prettier --check .')} to check code formatting.`);
    }
}

export function check(context) {
    const checker = new PrettierTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}