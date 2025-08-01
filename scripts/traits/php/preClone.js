import {execSync} from 'child_process';
import {logError, logSuccess} from '../../helper/logger.js';
import chalk from "chalk";
import {pathToFileURL} from 'url';

export function check(context) {
    try {
        execSync('php -v', {stdio: 'ignore'});
        logSuccess(`'${chalk.white('php')}' is installed.`);
    } catch (error) {
        logError('php command not found. Please install PHP to continue.');
        process.exit(1);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({});
}