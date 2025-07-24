
/*
================================================================================
File: scripts/core/hooks.js (Extensible Hook System & Trait Resolution Engine)
Description: Advanced hook execution system for the multirepo setup orchestrator.
             Implements a sophisticated trait-based architecture that allows for
             modular, composable repository setup behaviors. Manages the discovery,
             resolution, and execution of both built-in trait scripts and custom
             repository-specific hooks across preClone and postClone phases.

Key Responsibilities:
- Trait dependency resolution with circular dependency detection
- Hook discovery across multiple script locations and types
- Dynamic script loading and execution with context passing
- Custom script integration for repository-specific behaviors
- Command execution with proper error handling and logging
- Configuration-driven hook behavior modification
- Execution context management and enhancement

Hook Architecture:
- Trait Scripts: Reusable, composable behaviors in scripts/traits/
- Custom Scripts: Repository-specific JavaScript files in scripts/custom/
- Direct Commands: Shell commands specified directly in configuration
- Check Functions: Modern JavaScript module exports with context support
- Traditional Scripts: Legacy script execution via child processes
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for script discovery and validation
import fs from 'fs';
// Path utilities for cross-platform script location resolution
import path from 'path';
// YAML parser for trait configuration files
import yaml from 'js-yaml';
// Terminal styling for enhanced execution feedback
import chalk from 'chalk';
// Comprehensive logging system with context support
import { defaultLogger, log, logError, logInfo, logWarn } from '../helper/logger.js';
// Configuration paths and execution mode flags
import { customScriptsDir, isDryRun, traitScriptsDir } from './config.js';
// URL utilities for ES module dynamic imports
import { pathToFileURL } from 'url';

/*
================================================================================
HOOK DISCOVERY AND COLLECTION SYSTEM
================================================================================
*/

/**
 * Comprehensive hook discovery engine with trait dependency resolution
 *
 * This function implements a sophisticated hook discovery system that processes
 * repository traits, resolves dependencies, and collects all applicable hooks
 * for a specific phase (preClone/postClone). It handles complex trait hierarchies,
 * prevents circular dependencies, and integrates custom repository-specific hooks.
 *
 * Discovery Process:
 * 1. Trait normalization and validation
 * 2. Recursive trait dependency resolution
 * 3. Trait script and configuration loading
 * 4. Hook compilation with metadata preservation
 * 5. Custom script integration
 * 6. Hook list finalization and ordering
 *
 * Trait Resolution Features:
 * - Circular dependency detection and prevention
 * - Hierarchical trait composition (traits can depend on other traits)
 * - Configuration-driven behavior modification
 * - Selective hook function detection and handling
 * - Comprehensive error handling and recovery
 *
 * Hook Types Supported:
 * - Trait Scripts: Located in scripts/traits/{trait}/{hookType}.js
 * - Custom Scripts: Located in scripts/custom/{repo}/{script}.js
 * - Direct Commands: Shell commands specified in repository configuration
 *
 * @param {Object} repo - Repository configuration object with traits and hook definitions
 * @param {string} hookType - Hook phase identifier ('preClone' or 'postClone')
 * @returns {Array<Object>} Ordered array of hook objects with execution metadata
 */
export function getHooksForRepo(repo, hookType) {
    const hooks = [];
    const hookValue = repo[hookType]; // Custom hook value from repository configuration

    // === TRAIT NORMALIZATION ===
    // Ensure traits is always an array for consistent processing
    const traits = Array.isArray(repo.traits) ? repo.traits : (repo.traits ? [repo.traits] : []);

    // === EARLY TERMINATION FOR NO TRAITS ===
    if (traits.length === 0) {
        logInfo(`No traits configured for '${chalk.white(repo.name)}' - checking for custom hooks only.`);

        // Still process custom hooks even without traits
        if (hookValue) {
            return processCustomHook(repo, hookValue, hookType);
        }

        return [];
    }

    // === TRAIT PROCESSING STATE ===
    // Track processed traits to prevent infinite recursion and duplicate processing
    const processedTraits = new Set();
    const processingStack = []; // For circular dependency detection

    /**
     * Recursive trait processing with dependency resolution
     *
     * Processes traits in dependency order, handling nested trait relationships
     * and building a comprehensive hook list. Uses depth-first traversal with
     * cycle detection to ensure all dependencies are resolved correctly.
     *
     * @param {Array<string>} traitsToProcess - Array of trait names to process
     */
    const processTraits = (traitsToProcess) => {
        for (const trait of traitsToProcess) {
            // === CIRCULAR DEPENDENCY DETECTION ===
            if (processingStack.includes(trait)) {
                logError(`Circular dependency detected in trait chain: ${processingStack.join(' -> ')} -> ${trait}`);
                throw new Error(`Circular trait dependency: ${trait}`);
            }

            // === DUPLICATE PROCESSING PREVENTION ===
            if (processedTraits.has(trait)) {
                continue; // Already processed this trait
            }

            // === TRAIT PROCESSING INITIALIZATION ===
            processingStack.push(trait);
            processedTraits.add(trait);

            // === TRAIT FILE PATH RESOLUTION ===
            const traitHookScriptPath = path.join(traitScriptsDir, trait, `${hookType}.js`);
            const traitConfigPath = path.join(traitScriptsDir, trait, 'config.yaml');

            // === TRAIT CONFIGURATION LOADING ===
            let traitConfig = null;
            if (fs.existsSync(traitConfigPath)) {
                try {
                    const configContent = fs.readFileSync(traitConfigPath, 'utf8');
                    traitConfig = yaml.load(configContent);
                    logInfo(`Loaded configuration for trait '${chalk.white(trait)}'`);
                } catch (error) {
                    logWarn(`Failed to parse trait config '${chalk.white(trait)}': ${error.message}`);
                    processingStack.pop();
                    continue; // Skip this trait due to config error
                }
            } else {
                logError(`Trait config '${chalk.white(trait)}' not found at: ${traitConfigPath}`);
                processingStack.pop();
                continue; // Skip this trait - config is required
            }

            // === DEPENDENCY TRAIT PROCESSING ===
            // Process trait dependencies before processing the trait itself
            if (traitConfig?.traits && Array.isArray(traitConfig.traits)) {
                logInfo(`Processing ${traitConfig.traits.length} dependency trait(s) for '${chalk.white(trait)}'`);
                processTraits(traitConfig.traits);
            }

            // === TRAIT HOOK SCRIPT PROCESSING ===
            if (fs.existsSync(traitHookScriptPath)) {
                // === CHECK FUNCTION DETECTION ===
                // Determine if this trait script uses modern check function interface
                let hasCheckFunction = false;
                if (traitConfig?.hasCheckFunction) {
                    if (typeof traitConfig.hasCheckFunction === 'boolean') {
                        hasCheckFunction = traitConfig.hasCheckFunction;
                    } else if (typeof traitConfig.hasCheckFunction === 'object') {
                        hasCheckFunction = traitConfig.hasCheckFunction[hookType] || false;
                    }
                }

                // === HOOK OBJECT CREATION ===
                hooks.push({
                    type: 'trait-script',
                    trait: trait,
                    script: traitHookScriptPath,
                    hasCheckFunction: hasCheckFunction,
                    config: traitConfig,
                    description: traitConfig?.description || `${trait} trait hook`,
                    dependencies: traitConfig?.traits || []
                });

                logInfo(`Added ${hookType} hook for trait '${chalk.white(trait)}' (check function: ${hasCheckFunction})`);
            } else {
                // === MISSING SCRIPT VALIDATION ===
                // Only warn if trait has no dependencies (leaf traits should have scripts)
                if (!traitConfig?.traits || !Array.isArray(traitConfig.traits) || traitConfig.traits.length === 0) {
                    logWarn(`Trait '${chalk.white(trait)}' has no '${chalk.white(hookType)}' script and no dependency traits. This trait may be incomplete.`);
                }
            }

            // === PROCESSING STACK CLEANUP ===
            processingStack.pop();
        }
    };

    // === TRAIT PROCESSING EXECUTION ===
    try {
        processTraits(traits);
    } catch (error) {
        logError(`Trait processing failed for repository '${repo.name}': ${error.message}`);
        throw error;
    }

    // === CUSTOM HOOK INTEGRATION ===
    // Add custom repository-specific hooks after trait hooks
    if (hookValue) {
        const customHooks = processCustomHook(repo, hookValue, hookType);
        hooks.push(...customHooks);
    }

    // === HOOK LIST FINALIZATION ===
    logInfo(`Discovered ${chalk.cyan(hooks.length)} total hooks for '${chalk.white(repo.name)}' ${hookType} phase`);
    return hooks;
}

/**
 * Process custom repository-specific hooks
 *
 * Handles the integration of custom hooks that are specific to individual
 * repositories, supporting both JavaScript files and direct shell commands.
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} hookValue - Custom hook value from repository configuration
 * @param {string} hookType - Hook phase identifier
 * @returns {Array<Object>} Array of custom hook objects
 */
function processCustomHook(repo, hookValue, hookType) {
    const customHooks = [];

    if (hookValue.endsWith('.js')) {
        // === JAVASCRIPT CUSTOM SCRIPT ===
        const scriptPath = path.join(customScriptsDir, repo.name, hookValue);
        const scriptExists = fs.existsSync(scriptPath);

        customHooks.push({
            type: 'custom-script',
            script: scriptPath,
            exists: scriptExists,
            description: `Custom ${hookType} script: ${hookValue}`,
            repository: repo.name
        });

        if (scriptExists) {
            logInfo(`Added custom script hook: ${chalk.white(hookValue)} for '${chalk.white(repo.name)}'`);
        } else {
            logWarn(`Custom script not found: ${chalk.white(scriptPath)}`);
        }
    } else {
        // === DIRECT SHELL COMMAND ===
        customHooks.push({
            type: 'command',
            command: hookValue,
            description: `Custom ${hookType} command: ${hookValue}`,
            repository: repo.name
        });

        logInfo(`Added custom command hook for '${chalk.white(repo.name)}': ${chalk.white(hookValue)}`);
    }

    return customHooks;
}

/*
================================================================================
HOOK EXECUTION ORCHESTRATION SYSTEM
================================================================================
*/

/**
 * Comprehensive hook execution orchestrator with enhanced context management
 *
 * This function serves as the main entry point for executing all hooks associated
 * with a repository and phase. It manages the execution context, handles dry-run
 * mode, and provides comprehensive error handling and logging throughout the
 * execution process.
 *
 * Execution Features:
 * - Context enhancement with repository and execution metadata
 * - Dry-run mode support with execution simulation
 * - Sequential hook execution with proper error propagation
 * - Comprehensive logging and progress tracking
 * - Graceful error handling with detailed error reporting
 *
 * Context Enhancement:
 * - Repository configuration integration
 * - Hook type and phase information
 * - Logger instance with proper configuration
 * - Working directory and environment setup
 *
 * @param {Object} repo - Repository configuration object
 * @param {string} hookType - Hook phase identifier ('preClone' or 'postClone')
 * @param {Object} context - Execution context with working directory and logger
 * @returns {Promise<void>} Resolves when all hooks complete successfully
 */
export async function runHooks(repo, hookType, context = {}) {
    // === HOOK DISCOVERY ===
    const hooks = getHooksForRepo(repo, hookType);

    // === EARLY TERMINATION FOR NO HOOKS ===
    if (hooks.length === 0) {
        log(`No ${chalk.white(hookType)} hooks found for '${chalk.white(repo.name)}'. Skipping hook execution.`);
        return;
    }

    // === CONTEXT ENHANCEMENT ===
    // Enrich the execution context with repository and hook metadata
    const enhancedContext = {
        ...context,
        repo: repo,
        hookType: hookType,
        logger: context.logger || defaultLogger,
        startTime: Date.now(),
        hooksTotal: hooks.length,
        hooksCompleted: 0
    };

    logInfo(`Starting execution of ${chalk.cyan(hooks.length)} ${hookType} hooks for '${chalk.white(repo.name)}'`);

    // === DRY-RUN MODE HANDLING ===
    if (isDryRun) {
        logInfo(`Dry-run mode: Would execute ${hooks.length} hooks for '${repo.name}':`);
        hooks.forEach((hook, index) => {
            log(`  ${index + 1}. ${hook.type}: ${hook.description || hook.script || hook.command}`);
        });
        return;
    }

    // === SEQUENTIAL HOOK EXECUTION ===
    for (let i = 0; i < hooks.length; i++) {
        const hook = hooks[i];
        enhancedContext.hooksCompleted = i;
        enhancedContext.currentHook = hook;

        try {
            logInfo(`Executing hook ${i + 1}/${hooks.length}: ${hook.type} (${hook.trait || hook.repository || 'command'})`);

            await executeHook(hook, enhancedContext);

            logInfo(`Hook ${i + 1}/${hooks.length} completed successfully`);
        } catch (error) {
            // === ERROR HANDLING AND REPORTING ===
            logError(`Hook execution failed for '${repo.name}' at step ${i + 1}/${hooks.length}:`);
            logError(`  Hook Type: ${hook.type}`);
            logError(`  Hook Source: ${hook.trait || hook.script || hook.command}`);
            logError(`  Error: ${error.message}`);

            // Provide additional context for debugging
            if (error.code) {
                logError(`  Exit Code: ${error.code}`);
            }
            if (error.stderr) {
                logError(`  Error Output: ${error.stderr}`);
            }

            throw new Error(`Hook execution failed: ${error.message}`);
        }
    }

    // === EXECUTION COMPLETION ===
    const executionTime = Date.now() - enhancedContext.startTime;
    logInfo(`All ${chalk.cyan(hooks.length)} ${hookType} hooks completed successfully for '${chalk.white(repo.name)}' in ${executionTime}ms`);
}

/*
================================================================================
INDIVIDUAL HOOK EXECUTION SYSTEM
================================================================================
*/

/**
 * Execute a single hook based on its type with comprehensive error handling
 *
 * This function implements the core hook execution logic, dispatching to
 * appropriate execution methods based on hook type. It handles the different
 * execution patterns for trait scripts, custom scripts, and direct commands.
 *
 * Hook Execution Types:
 * 1. Trait Scripts with Check Functions: Modern ES module interface
 * 2. Trait Scripts Traditional: Legacy child process execution
 * 3. Custom Scripts: Repository-specific JavaScript files
 * 4. Direct Commands: Shell command execution
 *
 * @param {Object} hook - Hook object with type and execution metadata
 * @param {Object} context - Enhanced execution context with repository data
 * @returns {Promise<void>} Resolves when hook execution completes
 */
async function executeHook(hook, context) {
    // Import child_process dynamically to avoid loading it unnecessarily
    const { spawn } = await import('child_process');

    switch (hook.type) {
        case 'trait-script':
            await executeTraitScript(hook, context);
            break;

        case 'custom-script':
            await executeCustomScript(hook, context);
            break;

        case 'command':
            await executeCommand(hook, context, spawn);
            break;

        default:
            throw new Error(`Unknown hook type: ${hook.type}`);
    }
}

/**
 * Execute trait script with check function detection and fallback
 *
 * Handles the execution of trait scripts, supporting both modern check function
 * interface and traditional script execution patterns.
 *
 * @param {Object} hook - Trait script hook object
 * @param {Object} context - Execution context
 */
async function executeTraitScript(hook, context) {
    if (hook.hasCheckFunction) {
        // === MODERN CHECK FUNCTION EXECUTION ===
        try {
            const moduleUrl = pathToFileURL(hook.script).href;
            const module = await import(moduleUrl);

            if (typeof module.check === 'function') {
                log(`Executing check function for trait '${chalk.white(hook.trait)}'`);
                await module.check(context);
                log(`Check function completed for trait '${chalk.white(hook.trait)}'`);
            } else {
                logWarn(`Script '${hook.script}' marked as having check function but none found - falling back to traditional execution`);
                await executeScriptTraditionally(hook.script, context);
            }
        } catch (importError) {
            logWarn(`Failed to import module '${hook.script}': ${importError.message} - falling back to traditional execution`);
            await executeScriptTraditionally(hook.script, context);
        }
    } else {
        // === TRADITIONAL SCRIPT EXECUTION ===
        log(`Executing trait script: ${chalk.white(hook.script)}`);
        await executeScriptTraditionally(hook.script, context);
    }
}

/**
 * Execute custom repository-specific script
 *
 * Handles the execution of custom scripts with existence validation.
 *
 * @param {Object} hook - Custom script hook object
 * @param {Object} context - Execution context
 */
async function executeCustomScript(hook, context) {
    if (hook.exists) {
        log(`Executing custom script: ${chalk.white(hook.script)}`);
        await executeScriptTraditionally(hook.script, context);
        log(`Custom script completed: ${chalk.white(hook.script)}`);
    } else {
        logWarn(`Custom script not found: '${chalk.white(hook.script)}' - skipping execution`);
        throw new Error(`Custom script not found: ${hook.script}`);
    }
}

/**
 * Execute direct shell command
 *
 * Handles the execution of shell commands with proper error handling.
 *
 * @param {Object} hook - Command hook object
 * @param {Object} context - Execution context
 * @param {Function} spawn - Child process spawn function
 */
async function executeCommand(hook, context, spawn) {
    log(`Executing command: ${chalk.white(hook.command)}`);

    return new Promise((resolve, reject) => {
        const child = spawn('sh', ['-c', hook.command], {
            cwd: context.cwd,
            stdio: 'inherit',
            env: {
                ...process.env,
                REPO_NAME: context.repo.name,
                REPO_PATH: context.cwd,
                HOOK_TYPE: context.hookType
            }
        });

        child.on('close', (code) => {
            if (code === 0) {
                log(`Command completed successfully: ${chalk.white(hook.command)}`);
                resolve();
            } else {
                const error = new Error(`Command exited with code ${code}: ${hook.command}`);
                error.code = code;
                reject(error);
            }
        });

        child.on('error', (error) => {
            logError(`Command execution error: ${error.message}`);
            reject(error);
        });
    });
}

/*
================================================================================
TRADITIONAL SCRIPT EXECUTION SYSTEM
================================================================================
*/

/**
 * Execute JavaScript files using traditional child process spawning
 *
 * This function provides backward compatibility for scripts that don't use
 * the modern check function interface. It spawns a new Node.js process to
 * execute the script with proper error handling and environment setup.
 *
 * Execution Features:
 * - Child process isolation for script execution
 * - Environment variable injection for script context
 * - Comprehensive error handling with exit code tracking
 * - Working directory management
 * - Standard I/O inheritance for interactive scripts
 *
 * @param {string} scriptPath - Full path to the JavaScript file to execute
 * @param {Object} context - Execution context with working directory and metadata
 * @returns {Promise<void>} Resolves when script execution completes successfully
 */
async function executeScriptTraditionally(scriptPath, context) {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
        // === CHILD PROCESS CREATION ===
        const child = spawn('node', [scriptPath], {
            cwd: context.cwd,
            stdio: 'inherit', // Allow script to interact with terminal
            env: {
                ...process.env,
                // === SCRIPT CONTEXT ENVIRONMENT VARIABLES ===
                REPO_NAME: context.repo.name,
                REPO_PATH: context.cwd,
                HOOK_TYPE: context.hookType,
                REPO_URL: context.repo.url || '',
                REPO_TRAITS: JSON.stringify(context.repo.traits || []),
                SCRIPT_PATH: scriptPath
            }
        });

        // === SUCCESS HANDLING ===
        child.on('close', (code) => {
            if (code === 0) {
                log(`Script completed successfully: ${chalk.white(scriptPath)}`);
                resolve();
            } else {
                const error = new Error(`Script exited with code ${code}: ${scriptPath}`);
                error.code = code;
                error.scriptPath = scriptPath;
                reject(error);
            }
        });

        // === ERROR HANDLING ===
        child.on('error', (error) => {
            logError(`Script execution error: ${error.message}`);
            error.scriptPath = scriptPath;
            reject(error);
        });

        // === PROCESS CLEANUP ===
        // Ensure child process is cleaned up if parent process exits
        process.on('exit', () => {
            if (!child.killed) {
                child.kill();
            }
        });
    });
}