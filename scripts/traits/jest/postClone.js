import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import { logInfo, logSuccess } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class JestTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'jest');
    }

    async validateCore() {
        // Jest config is optional
        const jestConfigs = [
            'jest.config.js',
            'jest.config.json',
            'jest.config.ts'
        ];

        const foundConfig = this.configHelper.suggestConfigIfMissing(jestConfigs, 'Jest');
        if (!foundConfig) {
            this.logger.info('Jest will use defaults or package.json configuration.');
        }
    }

    async validateDependencies() {
        const hasJest = this.packageHelper.hasDependency('jest');
        if (hasJest) {
            this.logger.info(`Jest dependency found in ${chalk.white('package.json')}.`);
        } else {
            this.logger.warn('Jest dependency not found. Consider adding jest to devDependencies.');
        }

        // Check for Jest configuration in package.json
        if (this.packageHelper.packageJson?.jest) {
            this.logger.success(`Jest configuration found in ${chalk.white('package.json')}.`);
        }

        // Check for test script
        if (this.packageHelper.hasScript('test')) {
            const testScript = this.packageHelper.getScript('test');
            this.logger.success(`Test script found: ${chalk.cyan(testScript)}`);
        } else {
            this.logger.info(`Consider adding a ${chalk.cyan('"test": "jest"')} script to package.json.`);
        }
    }

    async validateStructure() {
        // Check for test directories
        const testDirs = [
            { name: '__tests__', message: `Test directory ${chalk.white('__tests__/')} found.` },
            { name: 'test', message: `Test directory ${chalk.white('test/')} found.` },
            { name: 'tests', message: `Test directory ${chalk.white('tests/')} found.` }
        ];

        this.directoryHelper.checkCommonDirectories(testDirs);

        // Check for test files in src
        if (this.directoryHelper.hasDirectory('src')) {
            const testFiles = this.directoryHelper.findFiles(/\.(test|spec)\.(js|jsx|ts|tsx)$/, true, 'src');
            if (testFiles.length > 0) {
                this.logger.success(`Test files found in ${chalk.white('src/')} directory.`);
            }
        }
    }

    async provideSuggestions() {
        this.logger.info(`Run ${chalk.cyan('jest')} or ${chalk.cyan('npm test')} to run tests.`);
    }
}

export function check(context) {
    const checker = new JestTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}