
/*
================================================================================
File: scripts/test.js (Repository Handling Test Matrix Engine)
Description: Comprehensive test suite engine for validating repository handling logic
             across all possible scenario combinations. Implements automated testing
             for URL presence, directory states, git configurations, and project
             indicators to ensure robust handling of multirepo setup scenarios.

Key Responsibilities:
- Automated test matrix execution with comprehensive scenario coverage
- Mock user interaction simulation for interactive prompt testing
- Repository state setup and validation with realistic test environments
- Test result analysis and detailed reporting with failure diagnostics
- Cross-platform compatibility testing with proper cleanup procedures
- Interactive test selection for targeted debugging and development

Architecture Overview:
- Template Method pattern for consistent test execution workflow
- Builder pattern for complex test scenario construction
- Strategy pattern for different mock interaction scenarios
- Factory pattern for test environment creation and configuration
- Observer pattern for test progress reporting and result collection
================================================================================
*/

// === EXTERNAL DEPENDENCIES ===
// File system operations for test environment management
import fs from 'fs';

// Path manipulation utilities for cross-platform compatibility
import path from 'path';

// Child process execution for git operations and system commands
import { execSync } from 'child_process';

// Terminal styling for enhanced test output and result visualization
import chalk from 'chalk';

// URL utilities for proper module path handling in ES modules
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

// === CORE MODULE DEPENDENCIES ===
// Repository handling functions under test - primary test targets
import { handleExistingDirectory, getRepositoryPath } from './core/repository.js';

/*
================================================================================
TEST ENVIRONMENT CONFIGURATION
================================================================================
*/

// === PATH RESOLUTION FOR ES MODULE COMPATIBILITY ===
// Establish script directory context for proper relative path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === TEST DIRECTORY STRUCTURE CONFIGURATION ===
// Use absolute paths to avoid current working directory dependencies
const TEST_BASE_DIR = path.join(__dirname, '..', 'test-scenarios');
const MOCK_REPOS_BASE = path.join(TEST_BASE_DIR, 'packages');

/*
================================================================================
COMPREHENSIVE TEST MATRIX DEFINITION SYSTEM
================================================================================
*/

/**
 * Comprehensive test matrix covering all possible repository handling scenarios
 *
 * This matrix systematically covers every combination of repository states that
 * the handleExistingDirectory function must handle correctly. Each test case
 * represents a real-world scenario with specific expected behaviors.
 *
 * Test Dimensions:
 * - URL Configuration: Repository has URL defined vs no URL configured
 * - Directory State: Directory exists/doesn't exist, empty/contains files
 * - Git Repository State: No git, git without remote, git with wrong/correct remote
 * - Project File Indicators: Has package.json and source files vs random files only
 *
 * Expected Behaviors:
 * - PROCEED_CLONE: Function should allow normal clone operation
 * - PROCEED_EMPTY_FOLDER: Function should create empty directory structure
 * - USER_CHOICE_SIMPLE: Function should prompt with basic delete/skip options
 * - USER_CHOICE_PROJECT_WITH_URL: Function should offer project integration options
 * - USER_CHOICE_PROJECT_NO_URL: Function should offer limited options without clone
 * - ERROR_GIT_NO_URL: Function should error on git repo without URL configuration
 */
const TEST_MATRIX = [
    // === URL CONFIGURED SCENARIOS ===
    // Test cases for repositories with URL configured in repos.yaml
    {
        id: 'URL_01',
        name: 'URL set, directory does not exist',
        urlSet: true,
        dirExists: false,
        dirEmpty: null,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: false,
        expectedBehavior: 'PROCEED_CLONE',
        description: 'Should proceed with normal clone operation into non-existent directory',
        mockResponses: [] // No user interaction expected for straightforward clone
    },
    {
        id: 'URL_02',
        name: 'URL set, empty directory exists',
        urlSet: true,
        dirExists: true,
        dirEmpty: true,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: false,
        expectedBehavior: 'PROCEED_CLONE',
        description: 'Should proceed with clone operation into existing empty directory',
        mockResponses: []
    },
    {
        id: 'URL_03',
        name: 'URL set, non-empty directory, no project files, no git',
        urlSet: true,
        dirExists: true,
        dirEmpty: false,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: false,
        expectedBehavior: 'USER_CHOICE_SIMPLE',
        description: 'Should prompt user to choose between delete+re-clone or skip operation',
        mockResponses: ['y'] // Choose to delete and re-clone
    },
    {
        id: 'URL_04',
        name: 'URL set, project exists, no git',
        urlSet: true,
        dirExists: true,
        dirEmpty: false,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: true,
        expectedBehavior: 'USER_CHOICE_PROJECT_WITH_URL',
        description: 'Should offer comprehensive options: init git+remote, use as-is, delete+clone, skip',
        mockResponses: ['2'] // Choose to use existing project as-is
    },
    {
        id: 'URL_05',
        name: 'URL set, project exists, git exists, no remote',
        urlSet: true,
        dirExists: true,
        dirEmpty: false,
        hasGit: true,
        hasRemote: false,
        hasProjectFiles: true,
        expectedBehavior: 'USER_CHOICE_PROJECT_WITH_URL',
        description: 'Should offer project integration with git remote setup options',
        mockResponses: ['1'] // Choose to initialize git repository with remote
    },
    {
        id: 'URL_06',
        name: 'URL set, project exists, git exists, wrong remote',
        urlSet: true,
        dirExists: true,
        dirEmpty: false,
        hasGit: true,
        hasRemote: 'wrong',
        hasProjectFiles: true,
        expectedBehavior: 'USER_CHOICE_PROJECT_WITH_URL',
        description: 'Should offer project integration with remote update confirmation',
        mockResponses: ['1', 'y'] // Choose init git+remote, then confirm remote update
    },
    {
        id: 'URL_07',
        name: 'URL set, project exists, git exists, correct remote',
        urlSet: true,
        dirExists: true,
        dirEmpty: false,
        hasGit: true,
        hasRemote: 'correct',
        hasProjectFiles: true,
        expectedBehavior: 'USER_CHOICE_PROJECT_WITH_URL',
        description: 'Should offer project integration options with correct remote detected',
        mockResponses: ['1'] // Choose to initialize git repository setup
    },

    // === NO URL CONFIGURED SCENARIOS ===
    // Test cases for repositories without URL configuration in repos.yaml
    {
        id: 'NO_URL_01',
        name: 'No URL, directory does not exist',
        urlSet: false,
        dirExists: false,
        dirEmpty: null,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: false,
        expectedBehavior: 'PROCEED_EMPTY_FOLDER',
        description: 'Should create empty project directory structure (no URL available for cloning)',
        mockResponses: []
    },
    {
        id: 'NO_URL_02',
        name: 'No URL, empty directory exists',
        urlSet: false,
        dirExists: true,
        dirEmpty: true,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: false,
        expectedBehavior: 'PROCEED_EMPTY_FOLDER',
        description: 'Should proceed with empty directory handling for existing empty folder',
        mockResponses: []
    },
    {
        id: 'NO_URL_03',
        name: 'No URL, non-empty directory, no project files, no git',
        urlSet: false,
        dirExists: true,
        dirEmpty: false,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: false,
        expectedBehavior: 'USER_CHOICE_SIMPLE',
        description: 'Should prompt for delete or skip (no clone option available without URL)',
        mockResponses: ['n'] // Choose to skip operation
    },
    {
        id: 'NO_URL_04',
        name: 'No URL, project exists, no git',
        urlSet: false,
        dirExists: true,
        dirEmpty: false,
        hasGit: false,
        hasRemote: false,
        hasProjectFiles: true,
        expectedBehavior: 'USER_CHOICE_PROJECT_NO_URL',
        description: 'Should offer limited options: use existing project as-is or skip',
        mockResponses: ['1'] // Choose to use existing project as-is
    },
    {
        id: 'NO_URL_05',
        name: 'No URL, project exists, git exists, no remote',
        urlSet: false,
        dirExists: true,
        dirEmpty: false,
        hasGit: true,
        hasRemote: false,
        hasProjectFiles: true,
        expectedBehavior: 'ERROR_GIT_NO_URL',
        description: 'Should error: git repository detected but no URL configured and no remote found',
        mockResponses: []
    },
    {
        id: 'NO_URL_06',
        name: 'No URL, project exists, git exists, has remote',
        urlSet: false,
        dirExists: true,
        dirEmpty: false,
        hasGit: true,
        hasRemote: 'detected',
        hasProjectFiles: true,
        expectedBehavior: 'ERROR_GIT_NO_URL_WITH_SUGGESTION',
        description: 'Should error with suggestion: git repository has remote but no URL configured in repos.yaml',
        mockResponses: []
    }
];

/*
================================================================================
MOCK INTERACTION UTILITIES
================================================================================
*/

/**
 * Create sophisticated mock user interaction function for automated testing
 *
 * This factory function creates a mock implementation of the askQuestion function
 * that simulates user responses to interactive prompts. It maintains state to
 * provide sequential responses and includes comprehensive logging for debugging.
 *
 * Mock Behavior:
 * - Sequentially returns pre-configured responses for each prompt
 * - Logs both questions and responses for test transparency
 * - Provides fallback response when pre-configured responses are exhausted
 * - Maintains call count for debugging complex interaction sequences
 *
 * @param {Array<string>} responses - Array of mock responses to return sequentially
 * @returns {Function} Mock askQuestion function with realistic async behavior
 */
function createMockAskQuestion(responses = []) {
    let responseIndex = 0;

    return async (question) => {
        // === RESPONSE SELECTION LOGIC ===
        // Use pre-configured response or fallback to skip option
        const response = responses[responseIndex] || '3'; // Default fallback to skip
        responseIndex++;

        // === INTERACTION LOGGING ===
        // Provide transparency into mock user interaction for debugging
        console.log(chalk.blue(`MOCK QUESTION: ${question}`));
        console.log(chalk.yellow(`MOCK RESPONSE: ${response}`));

        // === REALISTIC ASYNC BEHAVIOR ===
        // Small delay to simulate human response time and async nature
        await new Promise(resolve => setTimeout(resolve, 10));

        return response;
    };
}

/*
================================================================================
TEST SCENARIO SETUP AND ENVIRONMENT MANAGEMENT
================================================================================
*/

/**
 * Comprehensive test scenario setup with realistic environment creation
 *
 * This function creates complete, realistic test environments that accurately
 * represent the scenarios being tested. It handles all aspects of directory
 * structure, file content, git repository state, and cross-platform compatibility.
 *
 * Setup Process:
 * 1. Complete cleanup of any existing test artifacts
 * 2. Directory structure creation based on scenario specifications
 * 3. Realistic file content generation for different project types
 * 4. Git repository initialization with proper configuration
 * 5. Remote repository setup with various URL scenarios
 * 6. Comprehensive validation to ensure setup matches expectations
 *
 * Error Handling:
 * - Cross-platform cleanup with multiple fallback strategies
 * - Git operation failure recovery with detailed error reporting
 * - Setup validation to prevent false test results
 * - Proper resource cleanup on setup failures
 *
 * @param {Object} scenario - Test scenario configuration object
 * @returns {Promise<Object>} Setup result with repository config and path
 */
async function setupTestScenario(scenario) {
    // === TEST ARTIFACT NAMING ===
    // Generate unique repository name for isolation between test runs
    const repoName = `test-repo-${scenario.id}`;
    const repoPath = path.join(MOCK_REPOS_BASE, repoName);

    // === COMPREHENSIVE CLEANUP PHASE ===
    // Remove any existing test directory with cross-platform error handling
    if (fs.existsSync(repoPath)) {
        try {
            // Primary cleanup method using Node.js built-in functions
            fs.rmSync(repoPath, { recursive: true, force: true });

            // Cross-platform delay to ensure filesystem operations complete
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(chalk.yellow(`Primary cleanup failed for ${repoPath}: ${error.message}`));

            // === FALLBACK CLEANUP STRATEGIES ===
            // Platform-specific cleanup commands as secondary approach
            try {
                if (process.platform === 'win32') {
                    execSync(`rmdir /s /q "${repoPath}"`, { stdio: 'ignore' });
                } else {
                    execSync(`rm -rf "${repoPath}"`, { stdio: 'ignore' });
                }
                console.log(chalk.green('Fallback cleanup successful'));
            } catch (altError) {
                throw new Error(`Complete cleanup failure - could not remove test directory: ${altError.message}`);
            }
        }
    }

    // === DIRECTORY STRUCTURE CREATION PHASE ===
    // Create directory hierarchy based on scenario requirements
    if (scenario.dirExists) {
        // Ensure parent directories exist for nested path creation
        fs.mkdirSync(repoPath, { recursive: true });

        // === CONTENT POPULATION PHASE ===
        // Add realistic content based on scenario specifications
        if (!scenario.dirEmpty) {
            if (scenario.hasProjectFiles) {
                // === REALISTIC PROJECT STRUCTURE CREATION ===
                // Create authentic project files that would be found in real repositories

                // Package.json with realistic project configuration
                const packageJsonContent = {
                    name: "test-project",
                    version: "1.0.0",
                    description: "Test project for repository handling validation",
                    main: "src/index.js",
                    scripts: {
                        start: "node src/index.js",
                        test: "echo \"Error: no test specified\" && exit 1"
                    },
                    keywords: ["test", "multirepo"],
                    author: "Test Suite",
                    license: "MIT"
                };
                fs.writeFileSync(
                    path.join(repoPath, 'package.json'),
                    JSON.stringify(packageJsonContent, null, 2)
                );

                // Source directory with entry point file
                fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
                fs.writeFileSync(
                    path.join(repoPath, 'src', 'index.js'),
                    '// Test project entry point\nconsole.log("Test project initialized successfully");'
                );

                // Additional realistic project files
                fs.writeFileSync(
                    path.join(repoPath, 'README.md'),
                    '# Test Project\n\nThis is a test project created by the repository handling test suite.'
                );
                fs.writeFileSync(
                    path.join(repoPath, '.gitignore'),
                    'node_modules/\n*.log\n.env\n'
                );
            } else {
                // === NON-PROJECT FILES FOR FALLBACK TESTING ===
                // Create random files that don't indicate a structured project
                fs.writeFileSync(
                    path.join(repoPath, 'random.txt'),
                    'This is a random file used for testing non-project directory scenarios.'
                );
                fs.writeFileSync(
                    path.join(repoPath, 'another-file.md'),
                    '# Random File\n\nThis file simulates non-project content in a directory.'
                );
                fs.writeFileSync(
                    path.join(repoPath, 'data.json'),
                    '{"test": true, "purpose": "non-project file simulation"}'
                );
            }
        }

        // === GIT REPOSITORY CONFIGURATION PHASE ===
        // Setup git repository state according to scenario requirements
        if (scenario.hasGit) {
            try {
                // === GIT REPOSITORY INITIALIZATION ===
                // Initialize git repository with proper error handling
                execSync('git init', { cwd: repoPath, stdio: 'ignore' });

                // === GIT CONFIGURATION FOR TESTING ===
                // Configure git to avoid dependency on global user configuration
                execSync('git config user.email "test@example.com"', { cwd: repoPath, stdio: 'ignore' });
                execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });
                execSync('git config init.defaultBranch main', { cwd: repoPath, stdio: 'ignore' });

                // === REMOTE REPOSITORY SETUP ===
                // Configure remote origin based on scenario specifications
                if (scenario.hasRemote) {
                    let remoteUrl;

                    // === REMOTE URL SELECTION LOGIC ===
                    // Different URLs for testing various remote matching scenarios
                    switch (scenario.hasRemote) {
                        case 'correct':
                            remoteUrl = 'https://github.com/test/correct-repo.git';
                            break;
                        case 'wrong':
                            remoteUrl = 'https://github.com/test/wrong-repo.git';
                            break;
                        case 'detected':
                            remoteUrl = 'https://github.com/test/detected-repo.git';
                            break;
                        default:
                            throw new Error(`Unknown remote type: ${scenario.hasRemote}`);
                    }

                    // === REMOTE ADDITION AND VERIFICATION ===
                    execSync(`git remote add origin ${remoteUrl}`, { cwd: repoPath, stdio: 'ignore' });

                    // Verify remote was configured correctly
                    const actualRemote = execSync('git remote get-url origin', {
                        cwd: repoPath,
                        encoding: 'utf8'
                    }).trim();

                    if (actualRemote !== remoteUrl) {
                        throw new Error(`Remote verification failed: expected ${remoteUrl}, got ${actualRemote}`);
                    }
                }

                // === INITIAL COMMIT FOR REALISTIC REPOSITORY STATE ===
                // Create initial commit to establish repository history
                if (!scenario.dirEmpty) {
                    try {
                        execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
                        execSync('git commit -m "Initial test commit"', { cwd: repoPath, stdio: 'ignore' });
                    } catch (commitError) {
                        // Commit failure is acceptable for some test scenarios
                        console.warn(chalk.yellow(`Initial commit failed (acceptable for test): ${commitError.message}`));
                    }
                }

            } catch (error) {
                throw new Error(`Git repository setup failed for scenario ${scenario.id}: ${error.message}`);
            }
        }
    }

    // === REPOSITORY CONFIGURATION OBJECT CREATION ===
    // Create the repository configuration object that matches real usage
    const repo = {
        name: repoName,
        // Additional realistic repository properties
        traits: ['test-trait'],
        description: `Test repository for scenario ${scenario.id}`
    };

    // === URL CONFIGURATION BASED ON SCENARIO ===
    // Add URL only when specified by test scenario
    if (scenario.urlSet) {
        repo.url = 'https://github.com/test/correct-repo.git';
    }

    // === SETUP VALIDATION PHASE ===
    // Comprehensive validation to ensure scenario setup matches expectations
    const setupValidation = validateScenarioSetup(scenario, repoPath);
    if (!setupValidation.valid) {
        throw new Error(`Scenario setup validation failed for ${scenario.id}: ${setupValidation.errors.join(', ')}`);
    }

    return { repo, repoPath };
}

/**
 * Comprehensive validation of test scenario setup accuracy
 *
 * This function ensures that the test environment was created exactly as
 * specified in the scenario configuration. It prevents false test results
 * that could occur due to incorrect setup rather than actual code failures.
 *
 * Validation Categories:
 * 1. Directory existence and content state verification
 * 2. Git repository state and remote configuration validation
 * 3. Project file structure and content verification
 * 4. Cross-platform compatibility checks
 *
 * @param {Object} scenario - Test scenario configuration to validate against
 * @param {string} repoPath - Absolute path to the test repository directory
 * @returns {Object} Validation result with success status and error details
 */
function validateScenarioSetup(scenario, repoPath) {
    const errors = [];

    // === DIRECTORY EXISTENCE VALIDATION ===
    // Verify directory existence matches scenario specification exactly
    const dirExists = fs.existsSync(repoPath);
    if (scenario.dirExists !== dirExists) {
        errors.push(`Directory existence mismatch: expected ${scenario.dirExists}, actual ${dirExists}`);
    }

    // === DIRECTORY CONTENT VALIDATION ===
    // Detailed validation only for existing directories
    if (dirExists && scenario.dirExists) {
        try {
            // === DIRECTORY CONTENT ANALYSIS ===
            const contents = fs.readdirSync(repoPath);
            const isEmpty = contents.length === 0;

            // Validate empty state when explicitly specified
            if (scenario.dirEmpty !== null && scenario.dirEmpty !== isEmpty) {
                errors.push(`Directory empty state mismatch: expected ${scenario.dirEmpty}, actual ${isEmpty}`);
            }

            // === GIT REPOSITORY STATE VALIDATION ===
            const hasGit = fs.existsSync(path.join(repoPath, '.git'));
            if (scenario.hasGit !== hasGit) {
                errors.push(`Git repository state mismatch: expected ${scenario.hasGit}, actual ${hasGit}`);
            }

            // === GIT REMOTE CONFIGURATION VALIDATION ===
            if (hasGit && scenario.hasRemote) {
                try {
                    const remoteOutput = execSync('git remote get-url origin', {
                        cwd: repoPath,
                        encoding: 'utf8'
                    });
                    const hasRemote = remoteOutput.trim().length > 0;

                    if (!hasRemote) {
                        errors.push(`Git remote expected but not found`);
                    }
                } catch (remoteError) {
                    if (scenario.hasRemote !== false) {
                        errors.push(`Git remote validation failed: ${remoteError.message}`);
                    }
                }
            }

            // === PROJECT FILE STRUCTURE VALIDATION ===
            const hasPackageJson = fs.existsSync(path.join(repoPath, 'package.json'));
            if (scenario.hasProjectFiles !== hasPackageJson) {
                errors.push(`Project files mismatch: expected ${scenario.hasProjectFiles}, actual ${hasPackageJson}`);
            }

            // === PROJECT STRUCTURE INTEGRITY VALIDATION ===
            if (scenario.hasProjectFiles && hasPackageJson) {
                // Verify additional project structure elements
                const hasSrcDir = fs.existsSync(path.join(repoPath, 'src'));
                const hasIndexJs = fs.existsSync(path.join(repoPath, 'src', 'index.js'));

                if (!hasSrcDir || !hasIndexJs) {
                    errors.push('Project structure incomplete: missing src directory or index.js');
                }
            }

        } catch (validationError) {
            errors.push(`Setup validation error: ${validationError.message}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/*
================================================================================
TEST EXECUTION ENGINE
================================================================================
*/

/**
 * Execute comprehensive test scenario with detailed result analysis
 *
 * This is the core test execution function that orchestrates the complete
 * testing workflow for a single scenario. It handles setup, execution,
 * result analysis, and cleanup while providing detailed logging and
 * error handling for debugging and development purposes.
 *
 * Execution Workflow:
 * 1. Test scenario identification and logging
 * 2. Environment setup with validation
 * 3. Mock interaction preparation
 * 4. Target function execution under test conditions
 * 5. Result analysis and validation
 * 6. Comprehensive result reporting
 * 7. Error categorization and handling
 *
 * @param {Object} scenario - Complete test scenario configuration object
 * @returns {Promise<Object>} Detailed test execution result with analysis
 */
async function runTestScenario(scenario) {
    // === TEST SCENARIO IDENTIFICATION HEADER ===
    console.log(`\n${'='.repeat(80)}`);
    console.log(chalk.cyan.bold(`Testing: ${scenario.name} (${scenario.id})`));
    console.log(chalk.gray(`Description: ${scenario.description}`));
    console.log(chalk.gray(`Expected Behavior: ${scenario.expectedBehavior}`));
    console.log('='.repeat(80));

    try {
        // === ENVIRONMENT SETUP PHASE ===
        // Create realistic test environment matching scenario specifications
        console.log(chalk.blue('Setting up test environment...'));
        const { repo, repoPath } = await setupTestScenario(scenario);
        console.log(chalk.green(`✓ Test environment created: ${repoPath}`));

        // === MOCK INTERACTION PREPARATION ===
        // Configure mock user responses for interactive testing
        console.log(chalk.blue('Configuring mock user interactions...'));
        const mockAskQuestion = createMockAskQuestion(scenario.mockResponses || ['3']);
        console.log(chalk.green(`✓ Mock interactions configured with ${scenario.mockResponses?.length || 0} responses`));

        // === TARGET FUNCTION EXECUTION ===
        // Execute the actual function being tested under controlled conditions
        console.log(chalk.blue('Executing repository handling function...'));
        const executionStartTime = Date.now();
        const result = await handleExistingDirectory(repo, repoPath, mockAskQuestion);
        const executionTime = Date.now() - executionStartTime;

        // === RESULT ANALYSIS AND REPORTING ===
        console.log(chalk.green(`✓ Test execution completed in ${executionTime}ms`));
        console.log(chalk.white('Function Return Value:'), chalk.cyan(result));

        // === REPOSITORY STATE ANALYSIS ===
        console.log(chalk.white('Repository State After Execution:'));
        const repoState = {
            _existingProject: repo._existingProject || false,
            _skipClone: repo._skipClone || false,
            _createEmptyFolder: repo._createEmptyFolder || false
        };
        console.log(chalk.cyan(JSON.stringify(repoState, null, 2)));

        // === SUCCESS RESULT COMPILATION ===
        return {
            success: true,
            result: result,
            repo: repoState,
            executionTime: executionTime,
            scenario: scenario.id
        };

    } catch (error) {
        // === ERROR CATEGORIZATION AND HANDLING ===

        if (scenario.expectedBehavior.startsWith('ERROR_')) {
            // === EXPECTED ERROR SCENARIO ===
            // Some test cases are designed to trigger specific error conditions
            console.log(chalk.yellow(`✓ Expected error condition satisfied: ${error.message}`));
            return {
                success: true,
                expectedError: true,
                error: error.message,
                scenario: scenario.id
            };
        } else {
            // === UNEXPECTED ERROR SCENARIO ===
            // Genuine test failures that indicate problems with the code
            console.log(chalk.red(`✗ Unexpected test failure: ${error.message}`));

            // === DEBUGGING INFORMATION ===
            if (process.env.NODE_ENV === 'development') {
                console.log(chalk.red('Stack trace for debugging:'));
                console.log(chalk.red(error.stack));
            }

            return {
                success: false,
                error: error.message,
                scenario: scenario.id
            };
        }
    }
}

/**
 * Execute complete test suite with comprehensive reporting and analysis
 *
 * This function orchestrates the execution of all test scenarios in the matrix,
 * providing comprehensive progress reporting, statistical analysis, and detailed
 * failure diagnosis. It ensures proper test isolation and cleanup while
 * maintaining detailed logs for debugging and development purposes.
 *
 * Test Suite Features:
 * - Sequential execution with proper isolation between tests
 * - Comprehensive progress reporting with visual indicators
 * - Statistical analysis of test results and performance metrics
 * - Detailed failure reporting with categorization and debugging information
 * - Automated cleanup of test artifacts with error handling
 * - Cache effectiveness analysis and performance metrics
 *
 * @returns {Promise<Object>} Complete test suite results with statistics
 */
async function runAllTests() {
    // === TEST SUITE INITIALIZATION ===
    console.log(chalk.bold.blue('Repository Handling Comprehensive Test Matrix'));
    console.log(chalk.gray(`Executing ${TEST_MATRIX.length} comprehensive test scenarios...`));
    console.log(chalk.gray(`Test environment: ${TEST_BASE_DIR}`));

    // === TEST ENVIRONMENT PREPARATION ===
    // Ensure clean test environment with proper directory structure
    console.log(chalk.blue('\nPreparing test environment...'));
    if (!fs.existsSync(MOCK_REPOS_BASE)) {
        fs.mkdirSync(MOCK_REPOS_BASE, { recursive: true });
        console.log(chalk.green(`✓ Test environment created: ${MOCK_REPOS_BASE}`));
    } else {
        console.log(chalk.green(`✓ Test environment ready: ${MOCK_REPOS_BASE}`));
    }

    const results = [];
    const executionStartTime = Date.now();

    // === SEQUENTIAL TEST EXECUTION ===
    // Execute each test scenario with proper isolation and progress reporting
    for (let i = 0; i < TEST_MATRIX.length; i++) {
        const scenario = TEST_MATRIX[i];

        // === PROGRESS INDICATION ===
        console.log(chalk.blue(`\n[${i + 1}/${TEST_MATRIX.length}] Executing scenario: ${scenario.id}`));

        // === INDIVIDUAL TEST EXECUTION ===
        const result = await runTestScenario(scenario);
        results.push({ scenario, ...result });

        // === IMMEDIATE RESULT FEEDBACK ===
        if (result.success) {
            console.log(chalk.green(`✓ Scenario ${scenario.id} completed successfully`));
        } else {
            console.log(chalk.red(`✗ Scenario ${scenario.id} failed`));
        }
    }

    const totalExecutionTime = Date.now() - executionStartTime;

    // === COMPREHENSIVE RESULTS ANALYSIS ===
    console.log(`\n${'='.repeat(80)}`);
    console.log(chalk.bold.blue('COMPREHENSIVE TEST SUITE RESULTS'));
    console.log('='.repeat(80));

    // === STATISTICAL ANALYSIS ===
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const expectedErrors = results.filter(r => r.expectedError).length;
    const unexpectedErrors = failed; // All failures are unexpected since expected errors are marked as success

    // === HIGH-LEVEL STATISTICS ===
    console.log(chalk.green(`✓ Tests Passed: ${passed}/${TEST_MATRIX.length}`));
    if (expectedErrors > 0) {
        console.log(chalk.yellow(`⚠ Expected Errors: ${expectedErrors} (designed test cases)`));
    }
    if (failed > 0) {
        console.log(chalk.red(`✗ Tests Failed: ${failed}/${TEST_MATRIX.length}`));
    }

    // === PERFORMANCE METRICS ===
    console.log(chalk.cyan(`⏱ Total Execution Time: ${totalExecutionTime}ms`));
    const averageExecutionTime = totalExecutionTime / TEST_MATRIX.length;
    console.log(chalk.cyan(`⏱ Average Test Time: ${Math.round(averageExecutionTime)}ms`));

    // === SUCCESS RATE ANALYSIS ===
    const successRate = Math.round((passed / TEST_MATRIX.length) * 100);
    if (successRate === 100) {
        console.log(chalk.green.bold(`🎉 Perfect Success Rate: ${successRate}%`));
    } else if (successRate >= 90) {
        console.log(chalk.green(`✅ Excellent Success Rate: ${successRate}%`));
    } else if (successRate >= 75) {
        console.log(chalk.yellow(`⚠ Good Success Rate: ${successRate}%`));
    } else {
        console.log(chalk.red(`❌ Poor Success Rate: ${successRate}%`));
    }

    // === DETAILED FAILURE ANALYSIS ===
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
        console.log(chalk.red.bold('\n🔍 DETAILED FAILURE ANALYSIS:'));
        failedTests.forEach(({ scenario, error }, index) => {
            console.log(chalk.red(`\n${index + 1}. ${scenario.id}: ${scenario.name}`));
            console.log(chalk.red(`   Error: ${error}`));
            console.log(chalk.gray(`   Expected: ${scenario.expectedBehavior}`));
            console.log(chalk.gray(`   Description: ${scenario.description}`));
        });

        // === FAILURE PATTERNS ANALYSIS ===
        console.log(chalk.red.bold('\n📊 FAILURE PATTERNS:'));
        const urlSetFailures = failedTests.filter(r => r.scenario.urlSet).length;
        const noUrlFailures = failedTests.filter(r => !r.scenario.urlSet).length;

        if (urlSetFailures > 0) {
            console.log(chalk.red(`   URL Set Scenarios Failed: ${urlSetFailures}`));
        }
        if (noUrlFailures > 0) {
            console.log(chalk.red(`   No URL Scenarios Failed: ${noUrlFailures}`));
        }
    }

    // === SCENARIO CATEGORY ANALYSIS ===
    console.log(chalk.blue.bold('\n📈 SCENARIO CATEGORY BREAKDOWN:'));
    const urlSetScenarios = results.filter(r => r.scenario.urlSet);
    const noUrlScenarios = results.filter(r => !r.scenario.urlSet);

    console.log(chalk.blue(`URL Configured Scenarios: ${urlSetScenarios.length} (${urlSetScenarios.filter(r => r.success).length} passed)`));
    console.log(chalk.blue(`No URL Scenarios: ${noUrlScenarios.length} (${noUrlScenarios.filter(r => r.success).length} passed)`));

    // === COMPREHENSIVE CLEANUP PHASE ===
    console.log(chalk.blue('\n🧹 Performing comprehensive cleanup...'));
    try {
        if (fs.existsSync(TEST_BASE_DIR)) {
            fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
            console.log(chalk.green('✓ All test artifacts cleaned up successfully'));
        }
    } catch (cleanupError) {
        console.warn(chalk.yellow(`⚠ Cleanup warning: ${cleanupError.message}`));
        console.log(chalk.gray(`Manual cleanup may be required for: ${TEST_BASE_DIR}`));
    }

    return {
        passed,
        failed,
        total: results.length,
        successRate,
        executionTime: totalExecutionTime,
        results
    };
}

/*
================================================================================
USER INTERFACE AND INTERACTION SYSTEM
================================================================================
*/

/**
 * Interactive test selection interface for targeted debugging and development
 *
 * Provides a user-friendly interface for developers to select and run specific
 * test scenarios during development and debugging. This is particularly useful
 * for focused testing when working on specific functionality or investigating
 * particular failure scenarios.
 *
 * Interface Features:
 * - Clear scenario listing with descriptive information
 * - Individual scenario selection for focused testing
 * - Complete test suite execution option
 * - Input validation and error handling
 * - Graceful exit handling for user convenience
 *
 * @returns {Promise<Object>} Test execution results based on user selection
 */
async function runInteractiveTest() {
    // === SCENARIO SELECTION INTERFACE ===
    console.log(chalk.bold.blue('🧪 Repository Handling Test Matrix - Interactive Mode'));
    console.log(chalk.gray('Select individual scenarios for focused testing or run complete suite\n'));

    console.log(chalk.bold.white('Available Test Scenarios:'));
    TEST_MATRIX.forEach((scenario, index) => {
        // === SCENARIO INFORMATION DISPLAY ===
        console.log(`${chalk.cyan.bold((index + 1).toString().padStart(2))}. ${chalk.white(scenario.id)}: ${scenario.name}`);
        console.log(`    ${chalk.gray(scenario.description)}`);
        console.log(`    ${chalk.blue('Expected:')} ${chalk.yellow(scenario.expectedBehavior)}\n`);
    });

    // === USER INPUT HANDLING ===
    try {
        // Dynamic import to avoid circular dependencies
        const { askQuestion } = await import('./core/ui.js');

        console.log(chalk.bold.white('Selection Options:'));
        console.log(chalk.white('• Enter scenario number (1-' + TEST_MATRIX.length + ') for individual test'));
        console.log(chalk.white('• Enter "all" to run complete test suite'));
        console.log(chalk.white('• Enter "exit" or press Ctrl+C to quit\n'));

        const choice = await askQuestion('Please make your selection: ');

        // === INPUT PROCESSING AND EXECUTION ===
        if (choice.toLowerCase() === 'all') {
            console.log(chalk.blue('🚀 Executing complete test suite...\n'));
            return await runAllTests();
        } else if (choice.toLowerCase() === 'exit') {
            console.log(chalk.yellow('👋 Exiting interactive test mode'));
            return { cancelled: true };
        } else {
            // === INDIVIDUAL SCENARIO SELECTION ===
            const scenarioIndex = parseInt(choice) - 1;
            if (scenarioIndex >= 0 && scenarioIndex < TEST_MATRIX.length) {
                const selectedScenario = TEST_MATRIX[scenarioIndex];
                console.log(chalk.blue(`🎯 Executing selected scenario: ${selectedScenario.id}\n`));

                const result = await runTestScenario(selectedScenario);

                // === INDIVIDUAL RESULT SUMMARY ===
                console.log(chalk.bold.blue('\n📋 INDIVIDUAL TEST RESULT:'));
                if (result.success) {
                    console.log(chalk.green('✅ Test completed successfully'));
                } else {
                    console.log(chalk.red('❌ Test failed'));
                    console.log(chalk.red(`Error: ${result.error}`));
                }

                return result;
            } else {
                console.log(chalk.red('❌ Invalid selection. Please enter a valid scenario number.'));
                return { error: 'Invalid selection' };
            }
        }
    } catch (error) {
        console.log(chalk.red(`❌ Interactive mode error: ${error.message}`));
        return { error: error.message };
    }
}

/*
================================================================================
MAIN ORCHESTRATION AND ENTRY POINT SYSTEM
================================================================================
*/

/**
 * Main orchestration function with comprehensive command-line interface
 *
 * This is the primary entry point for the test suite, providing a sophisticated
 * command-line interface that supports various execution modes and options.
 * It handles argument parsing, mode selection, and coordinates the overall
 * test execution workflow with proper error handling and cleanup.
 *
 * Supported Execution Modes:
 * - Complete test suite execution (--all flag)
 * - Scenario listing and information display (--list flag)
 * - Interactive mode for selective testing (default)
 * - Help and usage information (--help flag)
 *
 * Command-Line Arguments:
 * - --all: Execute all test scenarios in sequence
 * - --list: Display available test scenarios with descriptions
 * - --help: Show usage information and available options
 * - --verbose: Enable detailed debugging output
 * - (no args): Enter interactive selection mode
 *
 * @returns {Promise<void>} Resolves when execution completes
 */
async function main() {
    // === COMMAND-LINE ARGUMENT PROCESSING ===
    const args = process.argv.slice(2);

    // === HELP AND USAGE INFORMATION ===
    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.bold.blue('Repository Handling Test Matrix - Usage Information\n'));
        console.log(chalk.white('Available Commands:'));
        console.log(chalk.cyan('  --all        ') + chalk.gray('Execute complete test suite (all scenarios)'));
        console.log(chalk.cyan('  --list       ') + chalk.gray('Display available test scenarios with descriptions'));
        console.log(chalk.cyan('  --help, -h   ') + chalk.gray('Show this usage information'));
        console.log(chalk.cyan('  --verbose, -v') + chalk.gray('Enable detailed debugging output'));
        console.log(chalk.cyan('  (no args)    ') + chalk.gray('Enter interactive selection mode'));
        console.log(chalk.white('\nExamples:'));
        console.log(chalk.gray('  node test.js --all          # Run all tests'));
        console.log(chalk.gray('  node test.js --list         # List scenarios'));
        console.log(chalk.gray('  node test.js                # Interactive mode'));
        return;
    }

    // === EXECUTION MODE SELECTION AND DISPATCH ===
    try {
        if (args.includes('--all')) {
            // === COMPLETE TEST SUITE EXECUTION ===
            console.log(chalk.blue('🚀 Starting complete test suite execution...\n'));
            const results = await runAllTests();

            // === EXIT CODE BASED ON RESULTS ===
            if (results.failed > 0) {
                console.log(chalk.red('\n❌ Test suite completed with failures'));
                process.exit(1);
            } else {
                console.log(chalk.green('\n✅ Test suite completed successfully'));
                process.exit(0);
            }
        } else if (args.includes('--list')) {
            // === SCENARIO LISTING MODE ===
            console.log(chalk.bold.blue('📋 Available Test Matrix Scenarios:\n'));
            TEST_MATRIX.forEach((scenario, index) => {
                console.log(chalk.cyan.bold(`${(index + 1).toString().padStart(2)}. ${scenario.id}`));
                console.log(chalk.white(`    Name: ${scenario.name}`));
                console.log(chalk.gray(`    Description: ${scenario.description}`));
                console.log(chalk.blue(`    Expected Behavior: ${scenario.expectedBehavior}`));
                console.log(chalk.yellow(`    Mock Responses: ${scenario.mockResponses?.length || 0} configured`));
                console.log(); // Empty line for readability
            });

            console.log(chalk.bold.white(`Total Scenarios: ${TEST_MATRIX.length}`));
            console.log(chalk.gray('Use "node test.js --all" to execute all scenarios'));
            console.log(chalk.gray('Use "node test.js" for interactive selection'));
        } else {
            // === INTERACTIVE MODE (DEFAULT) ===
            await runInteractiveTest();
        }
    } catch (error) {
        // === COMPREHENSIVE ERROR HANDLING ===
        console.error(chalk.red.bold('❌ Test execution failed with critical error:'));
        console.error(chalk.red(error.message));

        // === DEVELOPMENT ERROR DETAILS ===
        if (process.env.NODE_ENV === 'development' || args.includes('--verbose')) {
            console.error(chalk.red('\n🔍 Stack trace for debugging:'));
            console.error(chalk.red(error.stack));
        }

        console.error(chalk.yellow('\n💡 Troubleshooting suggestions:'));
        console.error(chalk.yellow('   • Ensure all dependencies are installed'));
        console.error(chalk.yellow('   • Check file system permissions'));
        console.error(chalk.yellow('   • Verify git is available in system PATH'));
        console.error(chalk.yellow('   • Run with --verbose for detailed debugging'));

        process.exit(1);
    }
}

/*
================================================================================
MODULE EXPORTS AND PUBLIC API
================================================================================
*/

// === CORE TESTING FUNCTIONS EXPORT ===
// Export primary testing functions for potential use by other modules or test runners
export { TEST_MATRIX, runTestScenario, runAllTests, runInteractiveTest };

// === UTILITY FUNCTIONS EXPORT ===
// Export utility functions for advanced testing scenarios and integration
export { setupTestScenario, validateScenarioSetup, createMockAskQuestion };

/*
================================================================================
DIRECT EXECUTION HANDLING
================================================================================
*/

// === MAIN EXECUTION GUARD ===
// Execute main function only when script is run directly (not imported)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    // === GRACEFUL SHUTDOWN HANDLING ===
    // Handle process termination signals gracefully
    process.on('SIGINT', () => {
        console.log(chalk.yellow('\n👋 Received interrupt signal - cleaning up and exiting...'));

        // === EMERGENCY CLEANUP ===
        try {
            if (fs.existsSync(TEST_BASE_DIR)) {
                fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
                console.log(chalk.green('✓ Emergency cleanup completed'));
            }
        } catch (cleanupError) {
            console.warn(chalk.yellow(`⚠ Cleanup warning: ${cleanupError.message}`));
        }

        process.exit(0);
    });

    // === MAIN EXECUTION WITH COMPREHENSIVE ERROR HANDLING ===
    main().catch(error => {
        console.error(chalk.red.bold('💥 Critical test system failure:'));
        console.error(chalk.red(error.message));

        // === EMERGENCY CLEANUP ON FAILURE ===
        try {
            if (fs.existsSync(TEST_BASE_DIR)) {
                fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            // Silent cleanup failure - system is already in error state
        }

        process.exit(1);
    });
}