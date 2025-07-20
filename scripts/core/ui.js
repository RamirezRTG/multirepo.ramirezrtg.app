/**
 * User interface module
 * Handles user prompts, interactions, and dry-run displays
 */
import readline from 'readline';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { log, logInfo, logQuestion, logSuccess } from '../helper/logger.js';
import { isDryRun, isVerbose, packagesDir } from './config.js';
import { getHooksForRepo } from './hooks.js';

/**
 * Enhanced inquirer wrapper with custom logging
 */
export async function safePrompt(safePromptConfig) {
    const inquirer = (await import('inquirer')).default;

    let validate;
    if (!safePromptConfig.allowEmpty) {
        const allowEmptyMessage = safePromptConfig.emptyMessage || 'You must choose at least one answer';
        validate = (answer) => answer.length < 1 ? allowEmptyMessage : true;
    } else {
        validate = () => true;
    }

    const choices = [];
    if (safePromptConfig.allChoice) {
        choices.push({ name: safePromptConfig.allChoice, value: 'all' });
        choices.push(new inquirer.Separator());
    }
    for (const choice of safePromptConfig.choices) {
        choices.push(choice);
    }

    let promptConfig = {
        type: safePromptConfig.type,
        message: safePromptConfig.message,
        name: safePromptConfig.name,
        default: safePromptConfig.default,
        choices: choices,
        validate: validate,
    }

    const result = await inquirer.prompt(promptConfig);
    await new Promise(resolve => setTimeout(resolve, 10));
    process.stdout.write('\x1b[1A\x1b[K\r\x1b[K');

    logQuestion(promptConfig.message);

    const selectedValues = result[safePromptConfig.name];
    if (Array.isArray(selectedValues)) {
        if (selectedValues.includes('all')) {
            logInfo(`Selected: ${chalk.white(safePromptConfig.allChoice || 'All')}`);
        } else {
            const selectedNames = selectedValues.map(value => {
                const choice = safePromptConfig.choices.find(c => c.value === value);
                return choice ? choice.name : value;
            });
            logInfo(`Selected: ${selectedNames.join(', ')}`);
        }
    } else {
        logInfo(`Selected: ${selectedValues}`);
    }

    return result;
}

/**
 * Simple question-answer interface with dry-run support
 */
export function askQuestion(query, defaultAnswer = "N") {
    if (isDryRun) {
        logInfo(`Dry run: ${query} (Default: ${defaultAnswer})`);
        return Promise.resolve(defaultAnswer);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    logQuestion(query + ` (Default: ${defaultAnswer})`);

    return new Promise(resolve => {
        rl.question('', ans => {
            const answer = ans || defaultAnswer;
            process.stdout.write('\x1b[1A\x1b[K\r\x1b[K');
            logInfo(`Answer: ${chalk.white(answer)}`);
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Handle repository selection for multi-repo setups
 */
export async function promptForRepositories(allRepos) {
    let reposToProcess = Object.entries(allRepos).map(([name, data]) => ({ name, ...data }));

    if (reposToProcess.length > 1) {
        if (isDryRun) {
            logInfo('Skipping repository selection in dry run mode.');
        } else {
            const choices = reposToProcess.map(repo => ({ name: repo.name, value: repo.name }));
            const { selections } = await safePrompt({
                type: 'checkbox',
                name: 'selections',
                message: 'Which repositories would you like to set up?',
                allowEmpty: false,
                emptyMessage: 'You must choose at least one repository.',
                allChoice: 'All Repositories',
                choices,
                default: 'all',
            });
            if (!selections.includes('all')) {
                reposToProcess = reposToProcess.filter(repo => selections.includes(repo.name));
            }
        }
    }

    return reposToProcess;
}

/**
 * Display what would happen in a dry run
 */
export function displayDryRunSummary(repos) {
    if (isVerbose) {
        logInfo('Generating detailed execution plan...');
        const plan = {};
        for (const repo of repos) {
            plan[repo.name] = {
                preClone: getHooksForRepo(repo, 'preClone'),
                clone: {
                    url: repo.url,
                    branch: repo.branch || 'default',
                    destination: path.join(packagesDir, repo.name),
                },
                postClone: getHooksForRepo(repo, 'postClone'),
            };
        }

        log(chalk.yellow('\n--- EXECUTION PLAN (DRY RUN) ---'));
        log(yaml.dump(plan, { styles: { '!!str': 'white' }, noRefs: true }));
        log(chalk.yellow('--- END OF PLAN ---'));
    } else {
        logInfo('Displaying summary of actions for dry run...');
        for (const repo of repos) {
            log(chalk.bold.white(`\nPlan for ${repo.name}:`));

            const preHooks = getHooksForRepo(repo, 'preClone');
            if (preHooks.length > 0) {
                log(chalk.gray(`  - Would run ${preHooks.length} pre-clone hook(s).`));
            }

            log(chalk.gray(`  - Would clone from ${repo.url}.`));

            const postHooks = getHooksForRepo(repo, 'postClone');
            if (postHooks.length > 0) {
                log(chalk.gray(`  - Would run ${postHooks.length} post-clone hook(s).`));
            }
        }
    }
    logSuccess('Dry run complete. No actions were taken.');
}