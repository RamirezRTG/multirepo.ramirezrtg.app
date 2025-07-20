/*
================================================================================
File: scripts/helper/logger.js (Enhanced)
Description: A shared utility for consistent, styled console logging.
             Supports both class-based and function-based usage patterns.
             Enhanced with persistent group support.
================================================================================
*/
import chalk from 'chalk';

// Log level constants
const LOG_LEVELS = {
    DEBUG: {label: '[DEBG]', color: chalk.blue, console: console.log},
    INFO: {label: '[INFO]', color: chalk.cyan, console: console.log},
    WARN: {label: '[WARN]', color: chalk.yellow, console: console.warn},
    ERROR: {label: '[ERR!]', color: chalk.red, console: console.error},
    SUCCESS: {label: '[OKAY]', color: chalk.green, console: console.log},
    QUES: {label: '[QUES]', color: chalk.magenta, console: console.log}
};

/**
 * Logger class for structured, configurable logging
 */
export class Logger {
    constructor(options = {}) {
        this.isVerbose = options.verbose ?? this.detectVerboseFlag();
        this.prefix = options.prefix ?? '';
        this.timestampEnabled = options.timestamp ?? true;
        this.colorEnabled = options.color ?? true;
        this.levels = {...LOG_LEVELS, ...(options.customLevels || {})};

        // Group state management
        this.groupStack = []; // Stack to support nested groups
        this.currentGroupPrefix = '';
        this.groupIndentChar = options.groupIndentChar ?? '│';
    }

    /**
     * Detect verbose flag from process arguments
     */
    detectVerboseFlag() {
        return process.argv.includes('--verbose') || process.argv.includes('-v');
    }

    /**
     * Get formatted timestamp
     */
    getTimestamp() {
        if (!this.timestampEnabled) return '';

        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `[${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
    }

    /**
     * Format log message with level, timestamp, prefix, and group indentation
     */
    formatLogMessage(level, message, indentationOffset = 0) {
        const parts = [];

        // Add timestamp
        if (this.timestampEnabled) {
            parts.push(this.getTimestamp());
        }

        // Add colored level
        if (this.colorEnabled) {
            parts.push(level.color(level.label));
        } else {
            parts.push(level.label);
        }

        // Add base prefix if configured
        if (this.prefix) {
            parts.push(this.colorEnabled ? chalk.blue(`[${this.prefix}]`) : `[${this.prefix}]`);
        }

        // Add group prefix (indentation)
        if (this.currentGroupPrefix) {
            if (indentationOffset > 0) {
                parts.push(this.colorEnabled ? chalk.gray(this.currentGroupPrefix.repeat(indentationOffset)) : this.currentGroupPrefix.repeat(indentationOffset));
            } else {
                parts.push(this.colorEnabled ? chalk.gray(this.currentGroupPrefix.slice(0, -1)) : this.currentGroupPrefix.slice(0, -1));
            }
        }

        // Add message
        const formattedMessage = this.colorEnabled ? chalk.gray(message) : message;
        parts.push(formattedMessage);

        return parts.join(' ');
    }

    /**
     * Core logging method
     */
    log(level, message, indentationOffset = 0) {
        if (level === this.levels.DEBUG && !this.isVerbose) {
            return; // Skip debug messages when not in verbose mode
        }

        const formattedMessage = this.formatLogMessage(level, message, indentationOffset);
        level.console(formattedMessage);
    }

    /**
     * Start a persistent group - all subsequent logs will be indented
     */
    groupStart(title) {
        // Log group start
        this.log(this.levels.INFO, `┌─${('▶').repeat(this.getGroupDepth() + 1)} ${chalk.bold.underline(title)}`);

        // Push current state to stack
        this.groupStack.push({
            title: title,
            prefix: this.currentGroupPrefix
        });

        // Update current group prefix
        this.currentGroupPrefix = this.currentGroupPrefix + this.groupIndentChar + ' ';

        return this;
    }

    /**
     * End the current persistent group
     */
    groupEnd() {
        if (this.groupStack.length === 0) {
            this.warn('groupEnd() called but no group is active');
            return this;
        }

        // Pop from stack
        const endedGroup = this.groupStack.pop();

        // Restore previous group prefix
        this.currentGroupPrefix = endedGroup.prefix;

        // Log group end
        this.log(this.levels.INFO, `└─${('◀').repeat(this.getGroupDepth() + 1)} ${chalk.bold.underline(endedGroup.title)}`);

        return this;
    }

    /**
     * End all active groups
     */
    groupEndAll() {
        while (this.groupStack.length > 0) {
            this.groupEnd();
        }
        return this;
    }

    /**
     * Get current group depth
     */
    getGroupDepth() {
        return this.groupStack.length;
    }

    /**
     * Get current group title (top of stack)
     */
    getCurrentGroupTitle() {
        return this.groupStack.length > 0 ? this.groupStack[this.groupStack.length - 1].title : null;
    }

    /**
     * Check if currently in a group
     */
    isInGroup() {
        return this.groupStack.length > 0;
    }

    /**
     * Traditional callback-based group (backward compatibility)
     */
    group(title, callback) {
        this.groupStart(title);
        try {
            callback(this);
        } finally {
            this.groupEnd();
        }
        return this;
    }

    /**
     * Debug logging (only shown in verbose mode)
     */
    debug(message) {
        this.log(this.levels.DEBUG, message);
    }

    /**
     * Info logging
     */
    info(message) {
        this.log(this.levels.INFO, message);
    }

    /**
     * Warning logging
     */
    warn(message) {
        this.log(this.levels.WARN, message);
    }

    /**
     * Error logging
     */
    error(message) {
        this.log(this.levels.ERROR, message);
    }

    /**
     * Success logging
     */
    success(message) {
        this.log(this.levels.SUCCESS, message);
    }

    /**
     * Question logging
     */
    question(message) {
        this.log(this.levels.QUES, message);
    }

    /**
     * Create a child logger with additional prefix
     */
    createChild(childPrefix) {
        const fullPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
        const child = new Logger({
            verbose: this.isVerbose,
            prefix: fullPrefix,
            timestamp: this.timestampEnabled,
            color: this.colorEnabled,
            customLevels: this.levels === LOG_LEVELS ? undefined : this.levels,
            groupIndentChar: this.groupIndentChar
        });

        // Inherit group state (but not the stack - child has independent grouping)
        child.currentGroupPrefix = this.currentGroupPrefix;

        return child;
    }

    /**
     * Enable/disable verbose mode
     */
    setVerbose(verbose) {
        this.isVerbose = verbose;
        return this;
    }

    /**
     * Enable/disable timestamps
     */
    setTimestamp(enabled) {
        this.timestampEnabled = enabled;
        return this;
    }

    /**
     * Enable/disable colors
     */
    setColor(enabled) {
        this.colorEnabled = enabled;
        return this;
    }

    /**
     * Set logger prefix
     */
    setPrefix(prefix) {
        this.prefix = prefix;
        return this;
    }

    /**
     * Set group indent character
     */
    setGroupIndentChar(char) {
        this.groupIndentChar = char;
        return this;
    }

    /**
     * Add custom log level
     */
    addLevel(name, config) {
        this.levels[name.toUpperCase()] = config;

        // Add method to logger instance
        const methodName = name.toLowerCase();
        this[methodName] = (message) => {
            this.log(this.levels[name.toUpperCase()], message);
        };

        return this;
    }

    /**
     * Batch logging for multiple messages
     */
    batch(level, messages) {
        messages.forEach(message => this.log(level, message));
        return this;
    }

    /**
     * Conditional logging
     */
    if(condition, level, message) {
        if (condition) {
            this.log(level, message);
        }
        return this;
    }
}

// Create default logger instance
export const defaultLogger = new Logger();

// Export function-based API for backward compatibility
export const log = (message) => defaultLogger.debug(message);
export const logDebug = (message) => defaultLogger.debug(message);
export const logInfo = (message) => defaultLogger.info(message);
export const logWarn = (message) => defaultLogger.warn(message);
export const logError = (message) => defaultLogger.error(message);
export const logSuccess = (message) => defaultLogger.success(message);
export const logQuestion = (message) => defaultLogger.question(message);

// Export group functions for backward compatibility
export const groupStart = (title) => defaultLogger.groupStart(title);
export const groupEnd = () => defaultLogger.groupEnd();
export const groupEndAll = () => defaultLogger.groupEndAll();

// Export utility functions for backward compatibility
export const getTimestamp = () => defaultLogger.getTimestamp();
export const formatLogMessage = (level, message) => defaultLogger.formatLogMessage(level, message);

// Export constants
export {LOG_LEVELS};

// Export the default logger instance
export const logger = defaultLogger;

// Export factory function for creating custom loggers
export const createLogger = (options) => new Logger(options);