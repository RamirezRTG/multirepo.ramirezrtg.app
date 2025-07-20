/**
 * Hook system module
 * Handles hook discovery, trait resolution, and execution
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';
import {defaultLogger, log, logError, logInfo, logWarn} from '../helper/logger.js';
import {customScriptsDir, isDryRun, traitScriptsDir} from './config.js';
import {pathToFileURL} from 'url';

/**
 * Discover and collect all hooks for a repository
 */
export function getHooksForRepo(repo, hookType) {
    const hooks = [];
    const hookValue = repo[hookType];
    const traits = Array.isArray(repo.traits) ? repo.traits : (repo.traits ? [repo.traits] : []);

    if (traits.length === 0) {
        logInfo(`No traits configured for '${chalk.white(repo.name)}'.`);
        return [];
    }

    const processedTraits = new Set();

    const processTraits = (traitsToProcess) => {
        for (const trait of traitsToProcess) {
            if (processedTraits.has(trait)) {
                continue;
            }
            processedTraits.add(trait);

            const traitHookScriptPath = path.join(traitScriptsDir, trait, `${hookType}.js`);
            const traitConfigPath = path.join(traitScriptsDir, trait, 'config.yaml');

            let traitConfig = null;
            if (fs.existsSync(traitConfigPath)) {
                try {
                    const configContent = fs.readFileSync(traitConfigPath, 'utf8');
                    traitConfig = yaml.load(configContent);
                } catch (error) {
                    logWarn(`Failed to parse trait config '${chalk.white(trait)}': ${error.message}`);
                }
            } else {
                logError(`Trait config '${chalk.white(trait)}' not found.`);
                continue;
            }

            if (traitConfig?.traits && Array.isArray(traitConfig.traits)) {
                processTraits(traitConfig.traits);
            }

            if (fs.existsSync(traitHookScriptPath)) {
                let hasCheckFunction = false;
                if (traitConfig?.hasCheckFunction) {
                    if (typeof traitConfig.hasCheckFunction === 'boolean') {
                        hasCheckFunction = traitConfig.hasCheckFunction;
                    } else if (typeof traitConfig.hasCheckFunction === 'object') {
                        hasCheckFunction = traitConfig.hasCheckFunction[hookType] || false;
                    }
                }

                hooks.push({
                    type: 'trait-script',
                    trait,
                    script: traitHookScriptPath,
                    hasCheckFunction: hasCheckFunction,
                    config: traitConfig
                });
            } else {
                if (!traitConfig?.traits || !Array.isArray(traitConfig.traits) || traitConfig.traits.length === 0) {
                    logWarn(`Trait '${chalk.white(trait)}' does not have a '${chalk.white(hookType)}' check function nor any subtraits. Skipping.`);
                }
            }
        }
    };

    processTraits(traits);

    if (hookValue) {
        if (hookValue.endsWith('.js')) {
            const scriptPath = path.join(customScriptsDir, repo.name, hookValue);
            hooks.push({type: 'custom-script', script: scriptPath, exists: fs.existsSync(scriptPath)});
        } else {
            hooks.push({type: 'command', command: hookValue});
        }
    }

    return hooks;
}

/**
 * Execute all hooks for a repository
 */
export async function runHooks(repo, hookType, context = {}) {
    const hooks = getHooksForRepo(repo, hookType);

    if (hooks.length === 0) {
        log(`No ${chalk.white(hookType)} hooks found for '${chalk.white(repo.name)}'. Skipping hook execution.`);
        return;
    }

    // Enhance context with repository information
    const enhancedContext = {
        ...context,
        repo: repo,
        hookType: hookType,
        logger: context.logger || defaultLogger
    };

    for (const hook of hooks) {
        if (isDryRun) continue;

        try {
            await executeHook(hook, enhancedContext);
        } catch (error) {
            logError(`Hook failed for '${repo.name}': ${error.message}`);
            process.exit(1);
        }
    }
}

/**
 * Execute a single hook based on its type
 */
async function executeHook(hook, context) {
    const {spawn} = await import('child_process');

    switch (hook.type) {
        case 'trait-script':
            if (hook.hasCheckFunction) {
                const moduleUrl = pathToFileURL(hook.script).href;
                const module = await import(moduleUrl);

                if (typeof module.check === 'function') {
                    log(`Executing check function for '${chalk.white(hook.trait)}'`);
                    await module.check(context);
                } else {
                    logWarn(`Script '${hook.script}' marked as having check function but none found`);
                    await executeScriptTraditionally(hook.script, context);
                }
            } else {
                log(`Executing script: ${chalk.white(hook.script)}`);
                await executeScriptTraditionally(hook.script, context);
            }
            break;

        case 'custom-script':
            if (hook.exists) {
                log(`Executing custom script: ${chalk.white(hook.script)}`);
                await executeScriptTraditionally(hook.script, context);
            } else {
                logWarn(`Custom script not found: '${chalk.white(hook.script)}'`);
            }
            break;

        case 'command':
            log(`Executing command: ${chalk.white(hook.command)}`);
            await new Promise((resolve, reject) => {
                const child = spawn('sh', ['-c', hook.command], {
                    cwd: context.cwd, stdio: 'inherit'
                });
                child.on('close', (code) => {
                    if (code === 0) resolve(); else reject(new Error(`Command exited with code ${code}`));
                });
            });
            break;
    }
}

/**
 * Execute a script file traditionally using spawn
 */
async function executeScriptTraditionally(scriptPath, context) {
    const {spawn} = await import('child_process');

    return new Promise((resolve, reject) => {
        const child = spawn('node', [scriptPath], {
            cwd: context.cwd, stdio: 'inherit'
        });
        child.on('close', (code) => {
            if (code === 0) resolve(); else reject(new Error(`Script exited with code ${code}`));
        });
    });
}