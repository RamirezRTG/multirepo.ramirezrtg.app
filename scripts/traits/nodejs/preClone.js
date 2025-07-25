import { execSync } from 'child_process';
import { logError, logSuccess } from '../../helper/logger.js';
import chalk from 'chalk';
import { pathToFileURL } from 'url';

export function check(context) {
    // Check Node.js
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
        logSuccess(`Node.js is installed: ${chalk.white(nodeVersion)}`);

        // Warn about very old versions
        const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
        if (majorVersion < 14) {
            logError(`Node.js ${nodeVersion} is too old. Please upgrade to Node.js 14+ for modern tooling support.`);
            process.exit(1);
        }
    } catch (error) {
        logError('Node.js not found. Please install Node.js to continue.');
        process.exit(1);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({});
}