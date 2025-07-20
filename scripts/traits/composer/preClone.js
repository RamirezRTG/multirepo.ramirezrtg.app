import {execSync} from 'child_process';
import {logError, logSuccess} from '../../helper/logger.js';
import chalk from "chalk";
import {pathToFileURL} from 'url';

export function check(context) {
    try {
        execSync('composer --version', {stdio: 'ignore'});
        logSuccess(`'${chalk.white('composer')}' is installed.`);
    } catch (error) {
        logError('composer command not found. Please install Composer to continue.');
        process.exit(1);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    check({});
}