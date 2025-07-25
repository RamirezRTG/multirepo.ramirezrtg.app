import { execSync } from 'child_process';
import { logError, logSuccess, logInfo } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

export function check(context) {
    // Check npm
    try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
        logSuccess(`npm is installed: ${chalk.white(npmVersion)}`);
    } catch (error) {
        logError('npm not found. Please install npm to continue.');
        process.exit(1);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({});
}