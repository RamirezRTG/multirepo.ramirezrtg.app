
import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import { logInfo, logWarn } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class TypeScriptTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'typescript');
    }

    async validateCore() {
        // Require tsconfig.json
        this.configHelper.requireFile('tsconfig.json', 'This is required for TypeScript projects.');

        // Validate JSON structure
        const tsConfig = this.configHelper.validateJsonFile('tsconfig.json');

        if (tsConfig) {
            this.validateCompilerOptions(tsConfig);
        }
    }

    async validateDependencies() {
        const hasTypeScript = this.packageHelper.hasDependency('typescript');
        if (hasTypeScript) {
            this.logger.info(`TypeScript dependency found in ${chalk.white('package.json')}.`);
        } else {
            this.logger.warn('TypeScript dependency not found. Consider adding typescript to devDependencies.');
        }

        const hasNodeTypes = this.packageHelper.hasDependency('@types/node');
        if (hasNodeTypes) {
            this.logger.info(`Node.js type definitions found in ${chalk.white('package.json')}.`);
        } else {
            this.logger.info(`Consider adding ${chalk.cyan('@types/node')} for Node.js type definitions.`);
        }
    }

    async validateStructure() {
        // Check for TypeScript source files
        this.validateSourceFiles();

        // Check for build output directories
        this.validateBuildOutput();
    }

    async provideSuggestions() {
        this.logger.info(`Run ${chalk.cyan('tsc --noEmit')} to check for TypeScript compilation errors.`);
    }

    /**
     * Validate TypeScript compiler options
     */
    validateCompilerOptions(tsConfig) {
        if (tsConfig.compilerOptions) {
            this.logger.info(`Compiler options found in ${chalk.white('tsconfig.json')}.`);

            if (!tsConfig.compilerOptions.target) {
                this.logger.info(`Consider specifying ${chalk.cyan('target')} in compiler options.`);
            }

            if (!tsConfig.compilerOptions.module) {
                this.logger.info(`Consider specifying ${chalk.cyan('module')} in compiler options.`);
            }

            if (tsConfig.compilerOptions.strict) {
                this.logger.info('Strict mode enabled in TypeScript configuration.');
            } else {
                this.logger.info(`Consider enabling ${chalk.cyan('strict')} mode for better type checking.`);
            }
        } else {
            this.logger.warn(`No compiler options found in ${chalk.white('tsconfig.json')}.`);
        }
    }

    /**
     * Validate TypeScript source files
     */
    validateSourceFiles() {
        const hasSourceDir = this.directoryHelper.hasDirectory('src');
        if (hasSourceDir) {
            const tsFiles = this.directoryHelper.findFiles(/\.(ts|tsx)$/, true, 'src');
            if (tsFiles.length > 0) {
                this.logger.info(`TypeScript source files found in ${chalk.white('src/')} directory.`);
            } else {
                this.logger.info(`No TypeScript files found in ${chalk.white('src/')} directory.`);
            }
        }
    }

    /**
     * Validate build output directories
     */
    validateBuildOutput() {
        const buildDirs = ['dist', 'build', 'lib'];
        const foundDirs = buildDirs.filter(dir => this.directoryHelper.hasDirectory(dir));

        if (foundDirs.length > 0) {
            foundDirs.forEach(dir => {
                this.logger.info(`Build output directory ${chalk.white(`${dir}/`)} found.`);
            });
        }
    }
}

export function check(context) {
    const checker = new TypeScriptTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}