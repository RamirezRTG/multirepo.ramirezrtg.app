import fs from 'fs';
import path from 'path';
import {logInfo, logSuccess, logWarn} from './logger.js';
import {ConfigFileHelper} from './config-file-helper.js';
import chalk from 'chalk';

export class PackageJsonHelper {
    constructor(cwd) {
        this.cwd = cwd;
        this.packageJsonPath = path.join(cwd, 'package.json');
        this._packageJson = null;
        this._loaded = false;

        // Use ConfigFileHelper for consistent file operations
        this.configHelper = new ConfigFileHelper(cwd);
    }

    /**
     * Load and parse package.json
     */
    loadPackageJson() {
        if (this._loaded) {
            return this._packageJson;
        }

        if (!fs.existsSync(this.packageJsonPath)) {
            this._loaded = true;
            this._packageJson = null;
            return null;
        }

        try {
            const packageContent = fs.readFileSync(this.packageJsonPath, 'utf8');
            this._packageJson = JSON.parse(packageContent);
            this._loaded = true;
            return this._packageJson;
        } catch (error) {
            logWarn(`Could not parse package.json: ${error.message}`);
            this._loaded = true;
            this._packageJson = null;
            return null;
        }
    }

    /**
     * Get package.json content (lazy loaded)
     */
    get packageJson() {
        if (!this._loaded) {
            this.loadPackageJson();
        }
        return this._packageJson;
    }

    /**
     * Check if package.json exists
     */
    exists() {
        return fs.existsSync(this.packageJsonPath);
    }

    /**
     * Require package.json to exist (now using ConfigFileHelper)
     */
    requirePackageJson(errorMessage = 'This is required for Node.js/npm projects.') {
        this.configHelper.requireFile('package.json', errorMessage);
    }

    /**
     * Validate package.json is valid JSON (now using ConfigFileHelper)
     */
    validateJson() {
        return this.configHelper.validateJsonFile('package.json');
    }

    /**
     * Check if a dependency exists
     */
    hasDependency(name, includeDevDeps = true) {
        const pkg = this.packageJson;
        if (!pkg) return false;

        const inDeps = pkg.dependencies && pkg.dependencies[name];
        const inDevDeps = includeDevDeps && pkg.devDependencies && pkg.devDependencies[name];

        return !!(inDeps || inDevDeps);
    }

    /**
     * Check multiple dependencies at once
     */
    hasAnyDependency(names, includeDevDeps = true) {
        return names.some(name => this.hasDependency(name, includeDevDeps));
    }

    /**
     * Get dependency version
     */
    getDependencyVersion(name, includeDevDeps = true) {
        const pkg = this.packageJson;
        if (!pkg) return null;

        if (pkg.dependencies && pkg.dependencies[name]) {
            return pkg.dependencies[name];
        }

        if (includeDevDeps && pkg.devDependencies && pkg.devDependencies[name]) {
            return pkg.devDependencies[name];
        }

        return null;
    }

    /**
     * Check if a script exists
     */
    hasScript(name) {
        const pkg = this.packageJson;
        return !!(pkg && pkg.scripts && pkg.scripts[name]);
    }

    /**
     * Get script content
     */
    getScript(name) {
        const pkg = this.packageJson;
        return pkg && pkg.scripts && pkg.scripts[name];
    }

    /**
     * Find scripts matching a pattern
     */
    findScripts(pattern) {
        const pkg = this.packageJson;
        if (!pkg || !pkg.scripts) return [];

        return Object.keys(pkg.scripts).filter(script => {
            if (typeof pattern === 'string') {
                return script.includes(pattern) || pkg.scripts[script].includes(pattern);
            }
            if (pattern instanceof RegExp) {
                return pattern.test(script) || pattern.test(pkg.scripts[script]);
            }
            return false;
        });
    }

    /**
     * Get engine requirement
     */
    getEngineRequirement(engine) {
        const pkg = this.packageJson;
        return pkg && pkg.engines && pkg.engines[engine];
    }

    /**
     * Check required fields
     */
    validateRequiredFields() {
        const pkg = this.packageJson;
        if (!pkg) return;

        if (!pkg.name) {
            logWarn(`${chalk.white('package.json')} is missing the ${chalk.cyan('name')} field.`);
        }

        if (!pkg.version) {
            logWarn(`${chalk.white('package.json')} is missing the ${chalk.cyan('version')} field.`);
        }

        if (!pkg.description) {
            logInfo(`${chalk.white('package.json')} could benefit from a ${chalk.cyan('description')} field.`);
        }
    }

    /**
     * Check entry point configuration
     */
    validateEntryPoint() {
        const pkg = this.packageJson;
        if (!pkg) return;

        if (!pkg.main && !pkg.module && !pkg.exports) {
            logInfo(`${chalk.white('package.json')} could benefit from a ${chalk.cyan('main')} or ${chalk.cyan('module')} entry point.`);
        } else {
            logSuccess(`Entry point configuration found in ${chalk.white('package.json')}.`);
        }
    }

    /**
     * Validate scripts section
     */
    validateScripts(commonScripts = ['start', 'test', 'build', 'dev']) {
        const pkg = this.packageJson;
        if (!pkg) return;

        if (!pkg.scripts) {
            logInfo(`${chalk.white('package.json')} has no scripts section. Consider adding common scripts like ${commonScripts.map(s => chalk.cyan(s)).join(', ')}.`);
        } else {
            logSuccess(`Scripts section found in ${chalk.white('package.json')}.`);

            const foundScripts = commonScripts.filter(script => pkg.scripts[script]);
            if (foundScripts.length > 0) {
                logInfo(`Available scripts: ${foundScripts.map(s => chalk.cyan(s)).join(', ')}`);
            }
        }
    }

    /**
     * Log engine requirements
     */
    logEngineRequirements() {
        const nodeVersion = this.getEngineRequirement('node');
        const npmVersion = this.getEngineRequirement('npm');

        if (nodeVersion) {
            logInfo(`Node.js version requirement found: ${chalk.cyan(nodeVersion)}`);
        }

        if (npmVersion) {
            logInfo(`npm version requirement found: ${chalk.cyan(npmVersion)}`);
        }
    }
}