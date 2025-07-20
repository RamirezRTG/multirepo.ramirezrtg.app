import { logInfo } from './logger.js';
import chalk from 'chalk';

export class TraitAdviser {
    constructor(activeTraits, packageHelper = null, configHelper = null, directoryHelper = null) {
        this.activeTraits = Array.isArray(activeTraits) ? activeTraits : (activeTraits ? [activeTraits] : []);
        this.packageHelper = packageHelper;
        this.configHelper = configHelper;
        this.directoryHelper = directoryHelper;
    }

    /**
     * Check if a trait is active
     */
    hasActiveTrait(traitName) {
        return this.activeTraits.includes(traitName);
    }

    /**
     * Suggest a trait if not already active
     */
    suggestTrait(traitName, detectionFunction, message) {
        if (!this.hasActiveTrait(traitName) && detectionFunction()) {
            logInfo(message || `${traitName} detected. Consider adding ${chalk.cyan(traitName)} trait.`);
            return true;
        }
        return false;
    }

    /**
     * Suggest trait based on dependencies
     */
    suggestTraitByDependency(traitName, dependencies, message = null) {
        if (this.hasActiveTrait(traitName) || !this.packageHelper) {
            return false;
        }

        const hasDeps = this.packageHelper.hasAnyDependency(dependencies);
        if (hasDeps) {
            const defaultMessage = `${dependencies[0]} dependencies detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
            logInfo(message || defaultMessage);
            return true;
        }
        return false;
    }

    /**
     * Suggest trait based on config files
     */
    suggestTraitByConfig(traitName, configFiles, message = null) {
        if (this.hasActiveTrait(traitName) || !this.configHelper) {
            return false;
        }

        const hasConfig = this.configHelper.hasAnyConfig(configFiles);
        if (hasConfig) {
            const defaultMessage = `${traitName} configuration detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
            logInfo(message || defaultMessage);
            return true;
        }
        return false;
    }

    /**
     * Suggest trait based on both dependencies and config
     */
    suggestTraitByDependencyOrConfig(traitName, dependencies, configFiles, message = null) {
        if (this.hasActiveTrait(traitName)) {
            return false;
        }

        const hasDeps = this.packageHelper && this.packageHelper.hasAnyDependency(dependencies);
        const hasConfig = this.configHelper && this.configHelper.hasAnyConfig(configFiles);

        if (hasDeps || hasConfig) {
            const defaultMessage = `${traitName} detected. Consider adding ${chalk.cyan(traitName)} trait for enhanced validation.`;
            logInfo(message || defaultMessage);
            return true;
        }
        return false;
    }

    /**
     * Suggest multiple framework traits at once
     */
    suggestFrameworkTraits() {
        const frameworkChecks = [
            {
                trait: 'react',
                deps: ['react', '@types/react'],
                configs: [],
                message: `React dependencies detected. Consider adding ${chalk.cyan('react')} trait for enhanced React validation.`
            },
            {
                trait: 'vue',
                deps: ['vue', '@vue/cli'],
                configs: [],
                message: `Vue.js dependencies detected. Consider adding ${chalk.cyan('vue')} trait for enhanced Vue validation.`
            },
            {
                trait: 'express',
                deps: ['express', '@types/express'],
                configs: [],
                message: `Express.js dependencies detected. Consider adding ${chalk.cyan('express')} trait for enhanced Express validation.`
            },
            {
                trait: 'nextjs',
                deps: ['next'],
                configs: [],
                message: `Next.js dependencies detected. Consider adding ${chalk.cyan('nextjs')} trait for enhanced Next.js validation.`
            }
        ];

        const suggestions = [];
        frameworkChecks.forEach(({ trait, deps, configs, message }) => {
            if (this.suggestTraitByDependencyOrConfig(trait, deps, configs, message)) {
                suggestions.push(trait);
            }
        });

        return suggestions;
    }

    /**
     * Suggest tool traits
     */
    suggestToolTraits() {
        const toolChecks = [
            {
                trait: 'typescript',
                deps: ['typescript', '@types/node'],
                configs: ['tsconfig.json'],
                message: `TypeScript detected. Consider adding ${chalk.cyan('typescript')} trait for enhanced TypeScript validation.`
            },
            {
                trait: 'eslint',
                deps: ['eslint'],
                configs: ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', '.eslintrc.yml'],
                message: `ESLint detected. Consider adding ${chalk.cyan('eslint')} trait for enhanced ESLint validation.`
            },
            {
                trait: 'prettier',
                deps: ['prettier'],
                configs: ['.prettierrc', '.prettierrc.json', '.prettierrc.yaml', 'prettier.config.js'],
                message: `Prettier detected. Consider adding ${chalk.cyan('prettier')} trait for enhanced Prettier validation.`
            },
            {
                trait: 'jest',
                deps: ['jest'],
                configs: ['jest.config.js', 'jest.config.json', 'jest.config.ts'],
                message: `Jest detected. Consider adding ${chalk.cyan('jest')} trait for enhanced Jest validation.`
            },
            {
                trait: 'webpack',
                deps: ['webpack'],
                configs: ['webpack.config.js', 'webpack.config.ts'],
                message: `Webpack detected. Consider adding ${chalk.cyan('webpack')} trait for enhanced Webpack validation.`
            },
            {
                trait: 'vite',
                deps: ['vite'],
                configs: ['vite.config.js', 'vite.config.ts'],
                message: `Vite detected. Consider adding ${chalk.cyan('vite')} trait for enhanced Vite validation.`
            }
        ];

        const suggestions = [];
        toolChecks.forEach(({ trait, deps, configs, message }) => {
            if (this.suggestTraitByDependencyOrConfig(trait, deps, configs, message)) {
                suggestions.push(trait);
            }
        });

        return suggestions;
    }

    /**
     * Suggest all missing traits
     */
    suggestAllMissingTraits() {
        const frameworkSuggestions = this.suggestFrameworkTraits();
        const toolSuggestions = this.suggestToolTraits();

        return [...frameworkSuggestions, ...toolSuggestions];
    }
}