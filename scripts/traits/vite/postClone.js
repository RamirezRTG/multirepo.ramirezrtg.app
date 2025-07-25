import { BaseTraitChecker } from '../../helper/base-trait-checker.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

class ViteTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'vite');
    }

    async validateCore() {
        // Vite dependency is required - check both dependencies and devDependencies
        if (!this.packageHelper.hasDependency('vite') && !this.packageHelper.hasDevDependency('vite')) {
            this.logger.error('Vite dependency not found. Run: npm install vite --save-dev');
            process.exit(1);
        }
        this.logger.success(`Vite dependency found in ${chalk.white('package.json')}.`);
    }

    async validateDependencies() {
        // Check for common Vite plugins based on detected frameworks
        this.validateVitePlugins();

        // Check for Vite-compatible dependencies
        this.validateViteCompatibility();
    }

    async validateStructure() {
        // Vite expects index.html in project root (not in public/ like CRA)
        this.configHelper.checkOptionalFile('index.html',
            `Vite entry file ${chalk.white('index.html')} found in project root.`,
            `Consider adding ${chalk.white('index.html')} to project root as Vite entry point.`
        );

        // Check for typical Vite project structure
        this.validateViteStructure();
    }

    async validateConfiguration() {
        // Check for Vite configuration files
        this.validateViteConfig();

        // Validate Vite-specific scripts
        this.validateViteScripts();
    }

    async provideSuggestions() {
        // Vite-specific suggestions
        this.logger.info(`Run ${chalk.cyan('npm run dev')} to start Vite development server.`);
        this.logger.info(`Run ${chalk.cyan('npm run build')} to build for production.`);

        // Let the npm trait handle general suggestions through its adviser
        // No need to duplicate framework detection here
    }

    /**
     * Validate Vite plugins based on detected technologies
     */
    validateVitePlugins() {
        const pluginChecks = [
            {
                plugin: '@vitejs/plugin-react',
                frameworks: ['react', 'react-dom'],
                message: 'React plugin for Vite development'
            },
            {
                plugin: '@vitejs/plugin-vue',
                frameworks: ['vue'],
                message: 'Vue plugin for Vite development'
            },
            {
                plugin: '@vitejs/plugin-legacy',
                frameworks: [], // General legacy browser support
                message: 'Legacy browser support plugin'
            }
        ];

        pluginChecks.forEach(({ plugin, frameworks, message }) => {
            const hasPlugin = this.packageHelper.hasDependency(plugin) || this.packageHelper.hasDevDependency(plugin);

            if (hasPlugin) {
                this.logger.success(`${chalk.white(plugin)} found - ${message}.`);
            } else if (frameworks.length > 0) {
                // Only suggest if the framework is actually used
                const hasFramework = frameworks.some(fw =>
                    this.packageHelper.hasDependency(fw) || this.packageHelper.hasDevDependency(fw)
                );

                if (hasFramework) {
                    this.logger.info(`Consider adding ${chalk.cyan(plugin)} for ${message}.`);
                }
            }
        });
    }

    /**
     * Check for potential Vite compatibility issues
     */
    validateViteCompatibility() {
        // Check for conflicting build tools
        const conflictingTools = ['webpack', 'webpack-cli', 'create-react-app'];
        const conflicts = conflictingTools.filter(tool =>
            this.packageHelper.hasDependency(tool) || this.packageHelper.hasDevDependency(tool)
        );

        if (conflicts.length > 0) {
            this.logger.warn(`Potential build tool conflicts detected: ${chalk.yellow(conflicts.join(', '))}. Ensure Vite configuration takes precedence.`);
        }
    }

    /**
     * Validate typical Vite project structure
     */
    validateViteStructure() {
        // Check for src directory (common but not required)
        if (this.directoryHelper.hasDirectory('src')) {
            this.logger.success(`${chalk.white('src/')} directory found.`);

            // Check for main.js/main.ts entry point
            const entryFiles = ['main.js', 'main.ts', 'main.jsx', 'main.tsx', 'index.js', 'index.ts'];
            const foundEntry = entryFiles.find(file => this.configHelper.hasFile(`src/${file}`));

            if (foundEntry) {
                this.logger.success(`Entry point found: ${chalk.white(`src/${foundEntry}`)}`);
            } else {
                this.logger.info(`Consider creating an entry point like ${chalk.cyan('src/main.js')} or ${chalk.cyan('src/index.js')}.`);
            }
        }

        // Check for public directory (for static assets)
        if (this.directoryHelper.hasDirectory('public')) {
            this.logger.success(`${chalk.white('public/')} directory found for static assets.`);
        }
    }

    /**
     * Validate Vite configuration files
     */
    validateViteConfig() {
        const viteConfigFiles = ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'];
        const foundConfig = this.configHelper.findConfig(viteConfigFiles);

        if (foundConfig) {
            this.logger.success(`Vite configuration file found: ${chalk.white(foundConfig)}`);
        } else {
            this.logger.info('No Vite configuration file found. Vite works with zero-config, but you can create vite.config.js for customization.');
        }
    }

    /**
     * Validate Vite-specific npm scripts
     */
    validateViteScripts() {
        const expectedScripts = [
            { name: 'dev', pattern: 'vite', required: true, suggestion: '"dev": "vite"' },
            { name: 'build', pattern: 'vite build', required: true, suggestion: '"build": "vite build"' },
            { name: 'preview', pattern: 'vite preview', required: false, suggestion: '"preview": "vite preview"' }
        ];

        expectedScripts.forEach(({ name, pattern, required, suggestion }) => {
            const script = this.packageHelper.getScript(name);

            if (script && script.includes('vite')) {
                this.logger.success(`Vite ${name} script found: ${chalk.cyan(script)}`);
            } else if (required) {
                this.logger.warn(`Missing Vite ${name} script. Consider adding: ${chalk.cyan(suggestion)}`);
            } else if (!script) {
                this.logger.info(`Optional: Add ${chalk.cyan(suggestion)} for ${name} functionality.`);
            }
        });
    }
}

export function check(context) {
    const checker = new ViteTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({ cwd: process.cwd() });
}