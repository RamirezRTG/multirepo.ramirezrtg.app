
/*
================================================================================
File: scripts/core/ui.js (User Interface & Interactive Experience Management)
Description: Comprehensive user interface system for the multirepo setup orchestrator.
             Manages all aspects of user interaction including prompts, confirmations,
             repository selection, and dry-run reporting. Provides a consistent and
             intuitive experience across different execution modes while maintaining
             accessibility and clear communication of system operations.

Key Responsibilities:
- Interactive repository selection with multi-choice support
- Safe prompting with validation and error handling
- Dry-run mode simulation and reporting
- Execution plan visualization and summary generation
- User input validation and sanitization
- Console output formatting and organization
- Accessibility features for different user preferences

User Experience Features:
- Smart defaults for common operations
- Clear visual feedback for selections and actions
- Comprehensive dry-run previews with detailed execution plans
- Graceful handling of interruptions and edge cases
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// Node.js readline interface for interactive prompts
import readline from 'readline';
// Path utilities for displaying file system locations
import path from 'path';
// YAML formatter for structured output display
import yaml from 'js-yaml';
// Terminal styling for enhanced visual feedback
import chalk from 'chalk';
// Logging system for consistent output formatting
import { log, logInfo, logQuestion, logSuccess } from '../helper/logger.js';
// Configuration flags for execution mode detection
import { isDryRun, isVerbose, packagesDir } from './config.js';
// Hook system integration for execution plan generation
import { getHooksForRepo } from './hooks.js';

/*
================================================================================
ADVANCED PROMPT SYSTEM WITH VALIDATION
================================================================================
*/

/**
 * Enhanced safe prompting system with comprehensive validation and logging
 *
 * This function provides a sophisticated prompting interface that wraps the
 * inquirer library with additional safety features, validation, and consistent
 * logging integration. It handles complex selection scenarios including
 * multi-choice options, "select all" functionality, and custom validation rules.
 *
 * Key Features:
 * - Automatic validation with customizable error messages
 * - "Select All" option for checkbox-style prompts
 * - Visual separator insertion for better organization
 * - Console cleanup to maintain clean output
 * - Comprehensive logging of user selections
 * - Error handling and recovery mechanisms
 *
 * Prompt Configuration Structure:
 * ```javascript
 * {
 *   type: 'checkbox',           // Inquirer prompt type
 *   name: 'fieldName',          // Result field name
 *   message: 'Prompt text',     // User-facing question
 *   allowEmpty: false,          // Whether empty selection is valid
 *   emptyMessage: 'Error text', // Custom empty selection error
 *   allChoice: 'All items',     // Text for "select all" option
 *   choices: [...],             // Array of choice objects
 *   default: 'defaultValue'     // Default selection
 * }
 * ```
 *
 * @param {Object} safePromptConfig - Comprehensive prompt configuration object
 * @returns {Promise<Object>} Inquirer result object with user selections
 */
export async function safePrompt(safePromptConfig) {
    // === DYNAMIC INQUIRER IMPORT ===
    // Use dynamic import to handle potential module loading issues
    const inquirer = (await import('inquirer')).default;

    // === VALIDATION FUNCTION CONFIGURATION ===
    // Setup validation logic based on configuration requirements
    let validate;
    if (!safePromptConfig.allowEmpty) {
        // Create custom validation for non-empty selections
        const allowEmptyMessage = safePromptConfig.emptyMessage || 'You must choose at least one answer';
        validate = (answer) => {
            // Handle both array and single value answers
            const isEmpty = Array.isArray(answer) ? answer.length < 1 : !answer;
            return isEmpty ? allowEmptyMessage : true;
        };
    } else {
        // Allow empty selections without validation
        validate = () => true;
    }

    // === CHOICE LIST CONSTRUCTION ===
    // Build the complete choice list with optional "select all" functionality
    const choices = [];

    // Add "select all" option if configured
    if (safePromptConfig.allChoice) {
        choices.push({
            name: safePromptConfig.allChoice,
            value: 'all'
        });
        choices.push(new inquirer.Separator()); // Visual separator
    }

    // Add all user-defined choices
    for (const choice of safePromptConfig.choices) {
        choices.push(choice);
    }

    // === INQUIRER PROMPT CONFIGURATION ===
    // Assemble the complete prompt configuration object
    let promptConfig = {
        type: safePromptConfig.type,
        message: safePromptConfig.message,
        name: safePromptConfig.name,
        default: safePromptConfig.default,
        choices: choices,
        validate: validate,
    };

    // === PROMPT EXECUTION AND CLEANUP ===
    // Execute the prompt and handle console cleanup
    const result = await inquirer.prompt(promptConfig);

    // Small delay to ensure prompt completion
    await new Promise(resolve => setTimeout(resolve, 10));

    // Clean up console output (remove inquirer artifacts)
    process.stdout.write('\x1b[1A\x1b[K\r\x1b[K');

    // === LOGGING AND FEEDBACK ===
    // Log the question for consistency with other UI components
    logQuestion(promptConfig.message);

    // === SELECTION RESULT PROCESSING ===
    // Process and log the user's selection with appropriate formatting
    const selectedValues = result[safePromptConfig.name];

    if (Array.isArray(selectedValues)) {
        // Handle multi-selection results
        if (selectedValues.includes('all')) {
            logInfo(`Selected: ${chalk.white(safePromptConfig.allChoice || 'All')}`);
        } else {
            // Map values back to display names for logging
            const selectedNames = selectedValues.map(value => {
                const choice = safePromptConfig.choices.find(c => c.value === value);
                return choice ? choice.name : value;
            });
            logInfo(`Selected: ${chalk.white(selectedNames.join(', '))}`);
        }
    } else {
        // Handle single-selection results
        logInfo(`Selected: ${chalk.white(selectedValues)}`);
    }

    return result;
}

/*
================================================================================
SIMPLE INTERACTIVE QUESTION SYSTEM
================================================================================
*/

/**
 * Streamlined question-answer interface with dry-run simulation support
 *
 * Provides a simple, direct way to ask yes/no or short-answer questions
 * with automatic dry-run mode handling. This function is optimized for
 * quick confirmations and simple user input scenarios where the full
 * inquirer interface would be overkill.
 *
 * Dry-Run Handling:
 * - Automatically returns default answer in dry-run mode
 * - Logs what would have been asked for user awareness
 * - Maintains execution flow without user intervention
 *
 * Interactive Features:
 * - Default answer support for quick confirmations
 * - Clean console output with proper formatting
 * - Consistent logging integration
 * - Graceful handling of empty responses
 *
 * @param {string} query - Question text to display to the user
 * @param {string} defaultAnswer - Default response if user provides no input
 * @returns {Promise<string>} User's response or default answer
 */
export function askQuestion(query, defaultAnswer = "N") {
    // === DRY-RUN MODE HANDLING ===
    // In dry-run mode, simulate the question without user interaction
    if (isDryRun) {
        logInfo(`Dry run: ${query} (Default: ${defaultAnswer})`);
        return Promise.resolve(defaultAnswer);
    }

    // === READLINE INTERFACE SETUP ===
    // Create readline interface for terminal input/output
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    // === QUESTION DISPLAY ===
    // Log the question with default value indication
    logQuestion(`${query} (Default: ${defaultAnswer})`);

    // === INTERACTIVE INPUT HANDLING ===
    return new Promise(resolve => {
        rl.question('', ans => {
            // === ANSWER PROCESSING ===
            // Use provided answer or fall back to default
            const answer = ans.trim() || defaultAnswer;

            // === CONSOLE CLEANUP ===
            // Remove the input line for clean output
            process.stdout.write('\x1b[1A\x1b[K\r\x1b[K');

            // === ANSWER LOGGING ===
            // Log the final answer for record keeping
            logInfo(`Answer: ${chalk.white(answer)}`);

            // === CLEANUP AND RESOLUTION ===
            rl.close();
            resolve(answer);
        });
    });
}

/*
================================================================================
REPOSITORY SELECTION SYSTEM
================================================================================
*/

/**
 * Comprehensive repository selection interface for multi-repository setups
 *
 * This function provides an intelligent repository selection system that
 * adapts to different scenarios - from single repository setups to complex
 * multi-repository environments. It handles user preferences, provides
 * sensible defaults, and maintains consistency across different execution modes.
 *
 * Selection Logic:
 * 1. Single repository: Automatically proceed without prompting
 * 2. Multiple repositories: Present interactive selection interface
 * 3. Dry-run mode: Skip selection and proceed with all repositories
 * 4. "Select All" option: Allow quick selection of all repositories
 *
 * User Experience Features:
 * - Clear repository identification and descriptions
 * - Checkbox-style multi-selection with validation
 * - "Select All" convenience option
 * - Empty selection prevention with helpful error messages
 * - Consistent formatting and visual feedback
 *
 * @param {Object} allRepos - Complete repository configuration from repos.yaml
 * @returns {Promise<Array>} Array of selected repository configuration objects
 */
export async function promptForRepositories(allRepos) {
    // === REPOSITORY NORMALIZATION ===
    // Convert repos object to consistent array format for processing
    let reposToProcess = Object.entries(allRepos).map(([name, data]) => ({
        name,
        ...data
    }));

    // === SINGLE REPOSITORY OPTIMIZATION ===
    // Skip selection interface for single repository setups
    if (reposToProcess.length <= 1) {
        if (reposToProcess.length === 1) {
            logInfo(`Single repository detected: ${chalk.white(reposToProcess[0].name)}`);
        } else {
            logInfo('No repositories configured');
        }
        return reposToProcess;
    }

    // === MULTI-REPOSITORY SELECTION INTERFACE ===
    logInfo(`Found ${chalk.cyan(reposToProcess.length)} repositories available for setup`);

    // === DRY-RUN MODE HANDLING ===
    if (isDryRun) {
        logInfo('Skipping repository selection in dry-run mode - processing all repositories');
        return reposToProcess;
    }

    // === INTERACTIVE SELECTION PROMPT ===
    try {
        // Build choice list with repository names and metadata
        const choices = reposToProcess.map(repo => {
            // Create descriptive choice names with additional context
            let choiceName = repo.name;

            // Add URL information if available
            if (repo.url) {
                choiceName += chalk.gray(` (${repo.url})`);
            } else {
                choiceName += chalk.gray(' (local/empty folder)');
            }

            return {
                name: choiceName,
                value: repo.name
            };
        });

        // Execute repository selection prompt
        const { selections } = await safePrompt({
            type: 'checkbox',
            name: 'selections',
            message: 'Which repositories would you like to set up?',
            allowEmpty: false,
            emptyMessage: 'You must choose at least one repository to proceed.',
            allChoice: 'All Repositories',
            choices,
            default: 'all',
        });

        // === SELECTION PROCESSING ===
        // Filter repositories based on user selection
        if (!selections.includes('all')) {
            const originalCount = reposToProcess.length;
            reposToProcess = reposToProcess.filter(repo => selections.includes(repo.name));

            logInfo(`Selected ${chalk.cyan(reposToProcess.length)} of ${chalk.cyan(originalCount)} available repositories`);
        } else {
            logInfo(`Selected all ${chalk.cyan(reposToProcess.length)} repositories`);
        }

    } catch (error) {
        // === ERROR HANDLING ===
        logError(`Repository selection failed: ${error.message}`);
        throw new Error('Repository selection was cancelled or failed');
    }

    return reposToProcess;
}

/*
================================================================================
DRY-RUN VISUALIZATION AND REPORTING SYSTEM
================================================================================
*/

/**
 * Comprehensive dry-run summary with detailed execution plan visualization
 *
 * This function provides sophisticated dry-run reporting that gives users
 * complete visibility into what operations would be performed during actual
 * execution. It adapts its output detail level based on user preferences
 * and provides both technical details and user-friendly summaries.
 *
 * Output Modes:
 * 1. Verbose Mode: Complete technical execution plan with YAML formatting
 * 2. Standard Mode: User-friendly summary with operation counts and descriptions
 *
 * Plan Components:
 * - PreClone hooks and their execution order
 * - Repository cloning operations with sources and destinations
 * - PostClone hooks and their dependencies
 * - Configuration validation and setup operations
 *
 * Visualization Features:
 * - Color-coded output for different operation types
 * - Structured YAML output for technical analysis
 * - Operation counting and summary statistics
 * - Clear separation between plan sections
 *
 * @param {Array} repos - Array of repository configuration objects to process
 */
export function displayDryRunSummary(repos) {
    // === VERBOSE MODE: DETAILED TECHNICAL PLAN ===
    if (isVerbose) {
        logInfo('Generating comprehensive technical execution plan...');

        // === EXECUTION PLAN CONSTRUCTION ===
        // Build complete technical plan with all operation details
        const plan = {};

        for (const repo of repos) {
            plan[repo.name] = {
                // === REPOSITORY METADATA ===
                metadata: {
                    name: repo.name,
                    type: repo.url ? 'git-repository' : 'local-project',
                    traits: repo.traits || [],
                    hasCustomScripts: {
                        preClone: !!(repo.preClone && repo.preClone.endsWith('.js')),
                        postClone: !!(repo.postClone && repo.postClone.endsWith('.js'))
                    }
                },

                // === PRE-CLONE OPERATIONS ===
                preClone: {
                    hooks: getHooksForRepo(repo, 'preClone'),
                    description: 'Environment validation and pre-setup operations'
                },

                // === CLONE OPERATIONS ===
                clone: {
                    operation: repo.url ? 'git-clone' : 'create-directory',
                    source: repo.url || 'N/A (local project)',
                    branch: repo.branch || 'default',
                    destination: path.join(packagesDir, repo.name),
                    description: repo.url ? 'Clone repository from remote' : 'Create local directory structure'
                },

                // === POST-CLONE OPERATIONS ===
                postClone: {
                    hooks: getHooksForRepo(repo, 'postClone'),
                    description: 'Project setup, dependency installation, and configuration'
                }
            };
        }

        // === YAML PLAN OUTPUT ===
        // Display the complete plan in structured YAML format
        log(chalk.yellow('\n' + '='.repeat(50)));
        log(chalk.yellow.bold('COMPREHENSIVE EXECUTION PLAN (DRY RUN)'));
        log(chalk.yellow('='.repeat(50)));

        // Format YAML with custom styling for better readability
        const yamlOutput = yaml.dump(plan, {
            styles: {
                '!!str': 'white'
            },
            noRefs: true,
            indent: 2,
            lineWidth: 100
        });

        log(yamlOutput);
        log(chalk.yellow('='.repeat(50)));

    } else {
        // === STANDARD MODE: USER-FRIENDLY SUMMARY ===
        logInfo('Displaying user-friendly summary of planned operations...');

        // === REPOSITORY-BY-REPOSITORY SUMMARY ===
        for (const repo of repos) {
            log(chalk.bold.white(`\n📁 Plan for ${repo.name}:`));

            // === PRE-CLONE OPERATIONS SUMMARY ===
            const preHooks = getHooksForRepo(repo, 'preClone');
            if (preHooks.length > 0) {
                log(chalk.gray(`   🔍 Would run ${chalk.cyan(preHooks.length)} pre-clone validation(s)`));

                // Show hook details in verbose summary
                if (preHooks.length <= 3) {
                    preHooks.forEach((hook, index) => {
                        log(chalk.gray(`      ${index + 1}. ${hook.description || hook.name || 'Validation hook'}`));
                    });
                }
            } else {
                log(chalk.gray(`   🔍 No pre-clone validations required`));
            }

            // === CLONE OPERATIONS SUMMARY ===
            if (repo.url) {
                log(chalk.gray(`   📥 Would clone from ${chalk.cyan(repo.url)}`));
                log(chalk.gray(`      └─ Destination: ${path.join(packagesDir, repo.name)}`));
                if (repo.branch && repo.branch !== 'main' && repo.branch !== 'master') {
                    log(chalk.gray(`      └─ Branch: ${chalk.cyan(repo.branch)}`));
                }
            } else {
                log(chalk.gray(`   📁 Would create local directory structure`));
                log(chalk.gray(`      └─ Location: ${path.join(packagesDir, repo.name)}`));
            }

            // === POST-CLONE OPERATIONS SUMMARY ===
            const postHooks = getHooksForRepo(repo, 'postClone');
            if (postHooks.length > 0) {
                log(chalk.gray(`   ⚙️  Would run ${chalk.cyan(postHooks.length)} post-clone setup operation(s)`));

                // Show hook details in summary
                if (postHooks.length <= 3) {
                    postHooks.forEach((hook, index) => {
                        log(chalk.gray(`      ${index + 1}. ${hook.description || hook.name || 'Setup operation'}`));
                    });
                }
            } else {
                log(chalk.gray(`   ⚙️  No post-clone setup operations required`));
            }

            // === TRAIT AND CUSTOM SCRIPT INDICATORS ===
            if (repo.traits && repo.traits.length > 0) {
                log(chalk.gray(`   🏷️  Traits: ${chalk.cyan(repo.traits.join(', '))}`));
            }

            const customScripts = [];
            if (repo.preClone && repo.preClone.endsWith('.js')) {
                customScripts.push(`preClone: ${repo.preClone}`);
            }
            if (repo.postClone && repo.postClone.endsWith('.js')) {
                customScripts.push(`postClone: ${repo.postClone}`);
            }
            if (customScripts.length > 0) {
                log(chalk.gray(`   🔧 Custom scripts: ${chalk.cyan(customScripts.join(', '))}`));
            }
        }
    }

    // === COMPLETION SUMMARY ===
    // Provide final summary statistics and confirmation
    const totalRepos = repos.length;
    const reposWithUrls = repos.filter(r => r.url).length;
    const reposWithoutUrls = totalRepos - reposWithUrls;

    log(chalk.bold.white('\n📊 Dry Run Summary:'));
    log(chalk.gray(`   Total repositories: ${chalk.cyan(totalRepos)}`));
    if (reposWithUrls > 0) {
        log(chalk.gray(`   Repositories to clone: ${chalk.cyan(reposWithUrls)}`));
    }
    if (reposWithoutUrls > 0) {
        log(chalk.gray(`   Local directories to create: ${chalk.cyan(reposWithoutUrls)}`));
    }

    logSuccess('Dry run analysis complete. No actual operations were performed.');
    logInfo('Run without --dry-run flag to execute these operations.');
}