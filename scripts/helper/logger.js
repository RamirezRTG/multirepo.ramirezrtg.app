/*
================================================================================
File: scripts/helper/logger.js (Advanced Logging System with Group Management)
Description: Comprehensive logging infrastructure for the multirepo setup orchestrator.
             Provides structured, styled console output with persistent group support,
             configurable log levels, and both class-based and functional interfaces.
             Serves as the foundation for all user feedback and debugging information
             throughout the entire setup process.

Key Features:
- Persistent group management with nested support
- Configurable log levels with color coding
- Timestamp and prefix support for context tracking
- Verbose mode filtering for development debugging
- Child logger creation for modular logging
- Backward compatibility with function-based API
- Custom log level registration and batch operations
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// Terminal styling library for enhanced visual feedback
import chalk from 'chalk';

/*
================================================================================
LOG LEVEL CONFIGURATION SYSTEM
================================================================================
*/

// === COMPREHENSIVE LOG LEVEL DEFINITIONS ===
// Each log level includes visual styling, console method, and semantic meaning
const LOG_LEVELS = {
    // Development and troubleshooting information (verbose mode only)
    DEBUG: {
        label: '[DEBG]',
        color: chalk.blue,
        console: console.log,
        description: 'Detailed debugging information for development'
    },

    // General informational messages about process progress
    INFO: {
        label: '[INFO]',
        color: chalk.cyan,
        console: console.log,
        description: 'General information about operation progress'
    },

    // Warning messages for non-critical issues that need attention
    WARN: {
        label: '[WARN]',
        color: chalk.yellow,
        console: console.warn,
        description: 'Warning messages for potential issues'
    },

    // Error messages for critical failures requiring user attention
    ERROR: {
        label: '[ERR!]',
        color: chalk.red,
        console: console.error,
        description: 'Error messages for critical failures'
    },

    // Success messages confirming completed operations
    SUCCESS: {
        label: '[OKAY]',
        color: chalk.green,
        console: console.log,
        description: 'Success confirmation messages'
    },

    // Question prompts for user interaction
    QUES: {
        label: '[QUES]',
        color: chalk.magenta,
        console: console.log,
        description: 'Interactive question prompts'
    }
};

/*
================================================================================
ADVANCED LOGGER CLASS WITH GROUP MANAGEMENT
================================================================================
*/

/**
 * Advanced Logger class providing structured, configurable logging with persistent groups
 *
 * This class serves as the core logging infrastructure for the entire application,
 * providing sophisticated features like nested group management, configurable
 * output formatting, and extensible log level systems. It supports both
 * development debugging and production user feedback scenarios.
 *
 * Core Capabilities:
 * - Persistent group management with visual nesting indicators
 * - Configurable timestamp, color, and prefix formatting
 * - Verbose mode filtering for development vs production output
 * - Child logger creation for modular component logging
 * - Custom log level registration for specialized use cases
 * - Batch operations and conditional logging utilities
 */
export class Logger {
    /**
     * Initialize logger with comprehensive configuration options
     *
     * Creates a new logger instance with customizable behavior for different
     * use cases. All options have sensible defaults that work well for
     * most scenarios while allowing fine-grained control when needed.
     *
     * @param {Object} options - Configuration object for logger behavior
     * @param {boolean} options.verbose - Enable debug message output
     * @param {string} options.prefix - Prefix string for all messages
     * @param {boolean} options.timestamp - Include timestamps in output
     * @param {boolean} options.color - Enable colored output
     * @param {Object} options.customLevels - Additional log levels to register
     * @param {string} options.groupIndentChar - Character used for group indentation
     */
    constructor(options = {}) {
        // === CORE CONFIGURATION ===
        this.isVerbose = options.verbose ?? this.detectVerboseFlag();
        this.prefix = options.prefix ?? '';
        this.timestampEnabled = options.timestamp ?? true;
        this.colorEnabled = options.color ?? true;
        this.levels = {...LOG_LEVELS, ...(options.customLevels || {})};

        // === GROUP STATE MANAGEMENT ===
        // Stack-based approach supports unlimited nesting of log groups
        this.groupStack = []; // Stack to support nested groups with complete state preservation
        this.currentGroupPrefix = ''; // Current indentation prefix applied to all messages
        this.groupIndentChar = options.groupIndentChar ?? '│'; // Visual character for group boundaries
    }

    /*
    ============================================================================
    CONFIGURATION AND ENVIRONMENT DETECTION
    ============================================================================
    */

    /**
     * Automatically detect verbose mode from command-line arguments
     *
     * Scans process arguments for verbose flags, providing automatic
     * configuration based on how the script was invoked.
     *
     * @returns {boolean} True if verbose mode should be enabled
     */
    detectVerboseFlag() {
        return process.argv.includes('--verbose') || process.argv.includes('-v');
    }

    /**
     * Generate formatted timestamp for log entries
     *
     * Creates human-readable timestamps in ISO-like format for consistent
     * log message timing information. Format: [YYYY-MM-DD HH:MM:SS]
     *
     * @returns {string} Formatted timestamp string or empty string if disabled
     */
    getTimestamp() {
        if (!this.timestampEnabled) return '';

        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        return `[${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
    }

    /*
    ============================================================================
    MESSAGE FORMATTING AND STYLING SYSTEM
    ============================================================================
    */

    /**
     * Comprehensive message formatting with level, timestamp, prefix, and group support
     *
     * This is the core formatting engine that assembles all message components
     * into a consistent, readable format. It handles color application,
     * indentation management, and component ordering.
     *
     * Message Format: [TIMESTAMP] [LEVEL] [PREFIX] [GROUP_INDENT] MESSAGE
     *
     * @param {Object} level - Log level configuration object
     * @param {string} message - Core message content to display
     * @param {number} indentationOffset - Additional indentation for special formatting
     * @returns {string} Fully formatted message ready for console output
     */
    formatLogMessage(level, message, indentationOffset = 0) {
        const parts = [];

        // === TIMESTAMP COMPONENT ===
        if (this.timestampEnabled) {
            const timestamp = this.getTimestamp();
            parts.push(this.colorEnabled ? chalk.gray(timestamp) : timestamp);
        }

        // === LOG LEVEL COMPONENT ===
        if (this.colorEnabled) {
            parts.push(level.color(level.label));
        } else {
            parts.push(level.label);
        }

        // === PREFIX COMPONENT ===
        // Custom prefix for logger instance identification
        if (this.prefix) {
            const prefixFormatted = `[${this.prefix}]`;
            parts.push(this.colorEnabled ? chalk.blue(prefixFormatted) : prefixFormatted);
        }

        // === GROUP INDENTATION COMPONENT ===
        // Visual hierarchy indication for nested operations
        if (this.currentGroupPrefix) {
            if (indentationOffset > 0) {
                // Additional indentation for special cases
                const extraIndent = this.currentGroupPrefix.repeat(indentationOffset);
                parts.push(this.colorEnabled ? chalk.gray(extraIndent) : extraIndent);
            } else {
                // Standard group indentation (remove trailing space)
                const groupIndent = this.currentGroupPrefix.slice(0, -1);
                parts.push(this.colorEnabled ? chalk.gray(groupIndent) : groupIndent);
            }
        }

        // === MESSAGE CONTENT COMPONENT ===
        parts.push(message);

        return parts.join(' ');
    }

    /*
    ============================================================================
    CORE LOGGING ENGINE
    ============================================================================
    */

    /**
     * Core logging method that handles all message output
     *
     * This is the central dispatch point for all log messages. It applies
     * filtering rules (like verbose mode), formats messages consistently,
     * and routes output to the appropriate console method.
     *
     * @param {Object} level - Log level configuration object
     * @param {string} message - Message content to log
     * @param {number} indentationOffset - Additional indentation level
     */
    log(level, message, indentationOffset = 0) {
        // === VERBOSE MODE FILTERING ===
        // Debug messages are only shown when verbose mode is explicitly enabled
        if (level === this.levels.DEBUG && !this.isVerbose) {
            return; // Skip debug messages when not in verbose mode
        }

        // === MESSAGE FORMATTING AND OUTPUT ===
        const formattedMessage = this.formatLogMessage(level, message, indentationOffset);
        level.console(formattedMessage);
    }

    /*
    ============================================================================
    PERSISTENT GROUP MANAGEMENT SYSTEM
    ============================================================================
    */

    /**
     * Start a persistent group with visual hierarchy indicators
     *
     * Creates a new logging group that affects all subsequent log messages
     * until explicitly ended. Groups can be nested indefinitely and maintain
     * complete state information for proper cleanup.
     *
     * Visual Format: ┌─▶ GROUP_TITLE
     *
     * @param {string} title - Descriptive title for the group operation
     * @returns {Logger} Returns this logger instance for method chaining
     */
    groupStart(title) {
        // === GROUP START VISUAL INDICATOR ===
        const groupDepth = this.getGroupDepth();
        const startIndicator = `┌─${'▶'.repeat(groupDepth + 1)} ${chalk.bold.underline(title)}`;
        this.log(this.levels.INFO, startIndicator);

        // === STATE PRESERVATION ===
        // Push current state to stack for proper nesting support
        this.groupStack.push({
            title: title,
            prefix: this.currentGroupPrefix,
            startTime: Date.now() // For potential duration tracking
        });

        // === INDENTATION UPDATE ===
        // All subsequent messages will be indented within this group
        this.currentGroupPrefix = this.currentGroupPrefix + this.groupIndentChar + ' ';

        return this;
    }

    /**
     * End the current persistent group with proper state restoration
     *
     * Closes the most recently opened group, restores the previous
     * indentation level, and provides visual closure indication.
     *
     * Visual Format: └─◀ GROUP_TITLE
     *
     * @returns {Logger} Returns this logger instance for method chaining
     */
    groupEnd() {
        // === GROUP STACK VALIDATION ===
        if (this.groupStack.length === 0) {
            this.warn('groupEnd() called but no group is active');
            return this;
        }

        // === STATE RESTORATION ===
        const endedGroup = this.groupStack.pop();
        this.currentGroupPrefix = endedGroup.prefix;

        // === GROUP END VISUAL INDICATOR ===
        const groupDepth = this.getGroupDepth();
        const endIndicator = `└─${'◀'.repeat(groupDepth + 1)} ${chalk.bold.underline(endedGroup.title)}`;
        this.log(this.levels.INFO, endIndicator);

        return this;
    }

    /**
     * Emergency cleanup function to end all active groups
     *
     * Provides a way to reset the logger state in error conditions
     * or when proper group cleanup wasn't possible. Ensures the
     * logger returns to a clean state.
     *
     * @returns {Logger} Returns this logger instance for method chaining
     */
    groupEndAll() {
        while (this.groupStack.length > 0) {
            this.groupEnd();
        }
        return this;
    }

    /*
    ============================================================================
    GROUP STATE INTROSPECTION UTILITIES
    ============================================================================
    */

    /**
     * Get the current nesting depth of active groups
     *
     * @returns {number} Number of currently active nested groups
     */
    getGroupDepth() {
        return this.groupStack.length;
    }

    /**
     * Get the title of the currently active group
     *
     * @returns {string|null} Title of the top-level group or null if no active groups
     */
    getCurrentGroupTitle() {
        return this.groupStack.length > 0 ? this.groupStack[this.groupStack.length - 1].title : null;
    }

    /**
     * Check if logger is currently within a group context
     *
     * @returns {boolean} True if at least one group is currently active
     */
    isInGroup() {
        return this.groupStack.length > 0;
    }

    /**
     * Traditional callback-based group for backward compatibility
     *
     * Provides a scoped group that automatically cleans up after the
     * callback execution, even if exceptions occur.
     *
     * @param {string} title - Group title
     * @param {Function} callback - Function to execute within the group
     * @returns {Logger} Returns this logger instance for method chaining
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

    /*
    ============================================================================
    CONVENIENCE LOGGING METHODS FOR EACH LEVEL
    ============================================================================
    */

    /**
     * Debug logging - only shown in verbose mode
     * Used for detailed development and troubleshooting information
     */
    debug(message) {
        this.log(this.levels.DEBUG, message);
    }

    /**
     * Info logging - general process information
     * Used for normal operation status and progress updates
     */
    info(message) {
        this.log(this.levels.INFO, message);
    }

    /**
     * Warning logging - non-critical issues
     * Used for situations that might require user attention but don't stop execution
     */
    warn(message) {
        this.log(this.levels.WARN, message);
    }

    /**
     * Error logging - critical failures
     * Used for serious problems that typically require user intervention
     */
    error(message) {
        this.log(this.levels.ERROR, message);
    }

    /**
     * Success logging - operation confirmations
     * Used to confirm successful completion of important operations
     */
    success(message) {
        this.log(this.levels.SUCCESS, message);
    }

    /**
     * Question logging - user interaction prompts
     * Used for interactive prompts and user input requests
     */
    question(message) {
        this.log(this.levels.QUES, message);
    }

    /*
    ============================================================================
    ADVANCED LOGGER FEATURES AND UTILITIES
    ============================================================================
    */

    /**
     * Create a child logger with inherited configuration and additional prefix
     *
     * Child loggers inherit all configuration from their parent but add
     * an additional prefix for component identification. They maintain
     * independent group states while sharing visual formatting.
     *
     * @param {string} childPrefix - Additional prefix for the child logger
     * @returns {Logger} New logger instance with combined prefix
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

        // === INHERIT CURRENT GROUP CONTEXT ===
        // Child loggers start with the same indentation as their parent
        child.currentGroupPrefix = this.currentGroupPrefix;

        return child;
    }

    /*
    ============================================================================
    RUNTIME CONFIGURATION METHODS
    ============================================================================
    */

    /**
     * Dynamically enable or disable verbose mode
     */
    setVerbose(verbose) {
        this.isVerbose = verbose;
        return this;
    }

    /**
     * Dynamically enable or disable timestamp inclusion
     */
    setTimestamp(enabled) {
        this.timestampEnabled = enabled;
        return this;
    }

    /**
     * Dynamically enable or disable colored output
     */
    setColor(enabled) {
        this.colorEnabled = enabled;
        return this;
    }

    /**
     * Update the logger prefix for context changes
     */
    setPrefix(prefix) {
        this.prefix = prefix;
        return this;
    }

    /**
     * Change the character used for group indentation
     */
    setGroupIndentChar(char) {
        this.groupIndentChar = char;
        return this;
    }

    /*
    ============================================================================
    EXTENSIBILITY AND UTILITY METHODS
    ============================================================================
    */

    /**
     * Register a custom log level with associated method
     *
     * Allows extension of the logger with domain-specific log levels
     * and automatically creates convenience methods for the new level.
     *
     * @param {string} name - Name of the new log level
     * @param {Object} config - Log level configuration object
     * @returns {Logger} Returns this logger instance for method chaining
     */
    addLevel(name, config) {
        this.levels[name.toUpperCase()] = config;

        // === DYNAMIC METHOD CREATION ===
        // Automatically create a convenience method for the new level
        const methodName = name.toLowerCase();
        this[methodName] = (message) => {
            this.log(this.levels[name.toUpperCase()], message);
        };

        return this;
    }

    /**
     * Batch logging for multiple messages at the same level
     *
     * Efficiently log multiple related messages without repeating
     * level specification for each message.
     *
     * @param {Object} level - Log level to use for all messages
     * @param {Array<string>} messages - Array of messages to log
     * @returns {Logger} Returns this logger instance for method chaining
     */
    batch(level, messages) {
        messages.forEach(message => this.log(level, message));
        return this;
    }

    /**
     * Conditional logging based on runtime conditions
     *
     * Only logs the message if the specified condition is true,
     * avoiding unnecessary string formatting and condition checks
     * in calling code.
     *
     * @param {boolean} condition - Condition that must be true to log
     * @param {Object} level - Log level to use if condition is met
     * @param {string} message - Message to log if condition is met
     * @returns {Logger} Returns this logger instance for method chaining
     */
    if(condition, level, message) {
        if (condition) {
            this.log(level, message);
        }
        return this;
    }
}

/*
================================================================================
DEFAULT LOGGER INSTANCE AND FUNCTIONAL API
================================================================================
*/

// === SHARED LOGGER INSTANCE ===
// Create default logger instance used by functional API and shared across modules
export const defaultLogger = new Logger();

// === BACKWARD COMPATIBILITY FUNCTIONAL API ===
// Provide function-based logging interface for simpler usage patterns
export const log = (message) => defaultLogger.debug(message);
export const logDebug = (message) => defaultLogger.debug(message);
export const logInfo = (message) => defaultLogger.info(message);
export const logWarn = (message) => defaultLogger.warn(message);
export const logError = (message) => defaultLogger.error(message);
export const logSuccess = (message) => defaultLogger.success(message);
export const logQuestion = (message) => defaultLogger.question(message);

// === GROUP MANAGEMENT FUNCTIONAL API ===
// Expose group functionality through simple function calls
export const groupStart = (title) => defaultLogger.groupStart(title);
export const groupEnd = () => defaultLogger.groupEnd();
export const groupEndAll = () => defaultLogger.groupEndAll();

// === UTILITY FUNCTION EXPORTS ===
// Provide access to utility functions for advanced usage
export const getTimestamp = () => defaultLogger.getTimestamp();
export const formatLogMessage = (level, message) => defaultLogger.formatLogMessage(level, message);

/*
================================================================================
MODULE EXPORTS AND FACTORY FUNCTIONS
================================================================================
*/

// === CONFIGURATION EXPORTS ===
// Export log level constants for external reference
export {LOG_LEVELS};

// === INSTANCE EXPORTS ===
// Export the default logger instance with alternative names
export const logger = defaultLogger;

// === FACTORY FUNCTION ===
// Export factory function for creating custom logger instances
export const createLogger = (options) => new Logger(options);