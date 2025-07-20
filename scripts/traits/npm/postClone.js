import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import { logInfo, logWarn } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class NpmTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'npm');
    }

    async validateCore() {
        // Require package.json to exist
        this.packageHelper.requirePackageJson('This is required for Node.js/npm projects.');

        // Validate JSON structure and basic fields
        this.packageHelper.validateJson();
        this.packageHelper.validateRequiredFields();
        this.packageHelper.validateEntryPoint();
        this.packageHelper.validateScripts();
    }

    async validateConfiguration() {
        // Check lock files (npm, yarn, pnpm)
        this.checkLockFiles();

        // Validate .gitignore
        this.configHelper.validateGitignore(['node_modules/', '.env'], 'Node.js');

        // Check for README
        this.configHelper.checkOptionalFile('README.md',
            `${chalk.white('README.md')} found.`,
            `Consider adding a ${chalk.white('README.md')} file to document your project.`
        );
    }

    async validateDependencies() {
        // Check node_modules directory
        this.validateNodeModules();

        // Log engine requirements
        this.packageHelper.logEngineRequirements();
    }

    async validateStructure() {
        // No specific structure requirements for basic npm projects
        // This will be handled by framework-specific traits
    }

    async provideSuggestions() {
        // Security suggestions
        this.logSecuritySuggestions();

        // Suggest missing traits based on detected technologies
        this.adviser.suggestAllMissingTraits();
    }

    /**
     * Check for different lock file types
     */
    checkLockFiles() {
        const lockFiles = [
            { file: 'package-lock.json', type: 'npm' },
            { file: 'yarn.lock', type: 'Yarn' },
            { file: 'pnpm-lock.yaml', type: 'pnpm' }
        ];

        const foundLock = lockFiles.find(({ file }) => this.configHelper.hasFile(file));

        if (foundLock) {
            this.logger.info(`${chalk.white(foundLock.file)} found (${foundLock.type} project).`);
        } else {
            this.logger.warn(`No lock file found. Run ${chalk.cyan('npm install')}, ${chalk.cyan('yarn install')}, or ${chalk.cyan('pnpm install')} to generate lock file and install dependencies.`);
        }
    }

    /**
     * Validate node_modules directory
     */
    validateNodeModules() {
        const hasNodeModules = this.directoryHelper.checkDirectory(
            'node_modules',
            `${chalk.white('node_modules')} directory found with dependencies installed.`,
            `${chalk.white('node_modules')} directory not found. Run ${chalk.cyan('npm install')} to install dependencies.`,
            `${chalk.white('node_modules')} directory is empty. Run ${chalk.cyan('npm install')} to install dependencies.`
        );

        if (hasNodeModules) {
            // Check for .bin directory
            if (this.directoryHelper.hasSubdirectory('node_modules', '.bin')) {
                this.logger.info(`Executable binaries available in ${chalk.white('node_modules/.bin')}.`);
            }
        }
    }
}

export function check(context) {
    const checker = new NpmTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}