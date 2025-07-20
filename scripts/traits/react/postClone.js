import {BaseTraitChecker} from '../../helper/base-trait-checker.js';
import chalk from 'chalk';
import {pathToFileURL} from 'url';

class ReactTraitChecker extends BaseTraitChecker {
    constructor(context) {
        super(context, 'react');
    }

    async validateCore() {
        // React dependency is required
        if (!this.packageHelper.hasDependency('react')) {
            this.logger.error('React dependency not found. This is required for React projects.');
            process.exit(1);
        }
        this.logger.success(`React dependency found in ${chalk.white('package.json')}.`);
    }

    async validateDependencies() {
        // Check for React DOM
        if (this.packageHelper.hasDependency('react-dom')) {
            this.logger.success(`React DOM dependency found in ${chalk.white('package.json')}.`);
        } else {
            this.logger.warn('React DOM dependency not found. Consider adding react-dom for web applications.');
        }

        // Check for React TypeScript types
        const hasReactTypes = this.packageHelper.hasDependency('@types/react');
        const hasReactDOMTypes = this.packageHelper.hasDependency('@types/react-dom');

        if (hasReactTypes) {
            this.logger.success(`React TypeScript types found in ${chalk.white('package.json')}.`);
        }

        if (hasReactDOMTypes) {
            this.logger.success(`React DOM TypeScript types found in ${chalk.white('package.json')}.`);
        }
    }

    async validateStructure() {
        // Check for public/index.html
        this.configHelper.checkOptionalFile('public/index.html',
            `${chalk.white('public/index.html')} found.`,
            `${chalk.white('public/index.html')} not found. This is typical for React applications.`
        );

        // Check for src directory and React components
        this.validateSourceStructure();
    }

    async validateConfiguration() {
        // Check for React development scripts
        this.validateReactScripts();
    }

    async provideSuggestions() {
        this.logger.info(`Run ${chalk.cyan('npm start')} or ${chalk.cyan('npm run dev')} to start the React development server.`);
    }

    /**
     * Validate React source structure
     */
    validateSourceStructure() {
        if (!this.directoryHelper.hasDirectory('src')) {
            this.logger.warn(`${chalk.white('src/')} directory not found. This is typical for React projects.`);
            return;
        }

        this.logger.success(`${chalk.white('src/')} directory found.`);

        // Check for React component files
        const reactPatterns = [
            {pattern: /\.(jsx|tsx)$/, name: 'React component', required: false},
            {pattern: /[Cc]omponent/, name: 'Component-named', required: false}
        ];

        this.directoryHelper.validateSourceStructure('src', reactPatterns);

        // Check for main App component
        const appFiles = ['App.js', 'App.jsx', 'App.ts', 'App.tsx'];
        const foundAppFile = appFiles.find(file => this.configHelper.hasFile(`src/${file}`));

        if (foundAppFile) {
            this.logger.success(`Main App component found: ${chalk.white(`src/${foundAppFile}`)}`);
        } else {
            this.logger.info(`No main App component found. Consider creating ${chalk.cyan('src/App.jsx')} or similar.`);
        }
    }

    /**
     * Validate React development scripts
     */
    validateReactScripts() {
        const startScript = this.packageHelper.getScript('start');
        if (startScript && this.isReactScript(startScript)) {
            this.logger.success(`React development server script found: ${chalk.cyan(startScript)}`);
        }

        const buildScript = this.packageHelper.getScript('build');
        if (buildScript && this.isReactScript(buildScript)) {
            this.logger.success(`React build script found: ${chalk.cyan(buildScript)}`);
        }
    }

    /**
     * Check if script is React-related
     */
    isReactScript(script) {
        return script.includes('react-scripts') ||
            script.includes('vite') ||
            script.includes('webpack');
    }
}

export function check(context) {
    const checker = new ReactTraitChecker(context);
    return checker.check(context);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({cwd: process.cwd()});
}