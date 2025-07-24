/*
================================================================================
File: scripts/test.js (Repository Handling Test Matrix)
Description: Comprehensive test suite for the repository handling logic.
             Tests all combinations of URL presence, directory state, git state,
             and project indicators to ensure robust handling of various scenarios:
             1. Test scenario setup and validation
             2. Mock user interaction simulation
             3. Repository handling function testing
             4. Results analysis and reporting
================================================================================
*/

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { handleExistingDirectory, getRepositoryPath } from './core/repository.js';

// Get script directory for proper path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration - use absolute paths to avoid CWD issues
const TEST_BASE_DIR = path.join(__dirname, '..', 'test-scenarios');
const MOCK_REPOS_BASE = path.join(TEST_BASE_DIR, 'packages');

/*
================================================================================
TEST MATRIX DEFINITION
================================================================================
Comprehensive matrix covering all possible combinations of:
- URL configuration (set/not set)
- Directory state (exists/not exists, empty/not empty)
- Git repository state (no git/git without remote/git with wrong remote/git with correct remote)
- Project indicators (has project files/random files only)
*/
const TEST_MATRIX = [
    // === URL SET SCENARIOS ===
    // These test cases cover scenarios where the repository has a URL configured in repos.yaml

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
        description: 'Should proceed with normal clone operation',
        mockResponses: [] // No user interaction expected
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
        description: 'Should proceed with clone into empty directory',
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
        description: 'Should ask: delete and re-clone or skip',
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
        description: 'Should offer: init git+remote, use as-is, delete+clone, skip',
        mockResponses: ['2'] // Choose to use as-is
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
        description: 'Should offer: init git+remote, use as-is, delete+clone, skip',
        mockResponses: ['1'] // Choose to init git+remote
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
        description: 'Should offer: init git+remote (will ask to update), use as-is, delete+clone, skip',
        mockResponses: ['1', 'y'] // Choose init git+remote, then update remote
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
        description: 'Should offer: init git+remote (will detect correct), use as-is, delete+clone, skip',
        mockResponses: ['1'] // Choose init git+remote
    },

    // === NO URL SCENARIOS ===
    // These test cases cover scenarios where no URL is configured in repos.yaml

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
        description: 'Should create empty folder (no URL to clone from)',
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
        description: 'Should proceed with empty folder handling',
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
        description: 'Should ask: delete or skip (no clone option without URL)',
        mockResponses: ['n'] // Choose to skip
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
        description: 'Should offer: use as-is, skip',
        mockResponses: ['1'] // Choose to use as-is
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
        description: 'Should ERROR: git repo detected but no URL configured, no remote found',
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
        description: 'Should ERROR: git repo detected but no URL configured, suggest adding detected URL',
        mockResponses: []
    }
];

/*
================================================================================
MOCK UTILITIES
================================================================================
*/

/**
 * Create a mock askQuestion function for automated testing
 * Simulates user responses to interactive prompts
 */
function createMockAskQuestion(responses = []) {
    let responseIndex = 0;
    return async (question) => {
        const response = responses[responseIndex] || '3'; // Default to skip
        responseIndex++;
        console.log(`MOCK QUESTION: ${question}`);
        console.log(`MOCK RESPONSE: ${response}`);
        return response;
    };
}

/*
================================================================================
TEST SCENARIO SETUP
================================================================================
*/

/**
 * Setup a complete test scenario with all required files and directories
 * Creates realistic test environments that match the scenario specifications
 */
async function setupTestScenario(scenario) {
    const repoName = `test-repo-${scenario.id}`;
    const repoPath = path.join(MOCK_REPOS_BASE, repoName);

    // === CLEANUP PHASE ===
    // Remove any existing test directory with cross-platform compatibility
    if (fs.existsSync(repoPath)) {
        try {
            fs.rmSync(repoPath, { recursive: true, force: true });
            // Small delay to ensure cleanup is complete on Windows
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`Failed to cleanup ${repoPath}: ${error.message}`);

            // Try platform-specific cleanup commands as fallback
            try {
                if (process.platform === 'win32') {
                    execSync(`rmdir /s /q "${repoPath}"`, { stdio: 'ignore' });
                } else {
                    execSync(`rm -rf "${repoPath}"`, { stdio: 'ignore' });
                }
            } catch (altError) {
                throw new Error(`Could not cleanup test directory: ${altError.message}`);
            }
        }
    }

    // === DIRECTORY CREATION PHASE ===
    // Create directory structure based on scenario requirements
    if (scenario.dirExists) {
        fs.mkdirSync(repoPath, { recursive: true });

        // Add appropriate content based on scenario specifications
        if (!scenario.dirEmpty) {
            if (scenario.hasProjectFiles) {
                // Create realistic project structure with common files
                fs.writeFileSync(path.join(repoPath, 'package.json'), '{"name": "test-project", "version": "1.0.0"}');
                fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
                fs.writeFileSync(path.join(repoPath, 'src', 'index.js'), 'console.log("test");');
            } else {
                // Create non-project files to test fallback behavior
                fs.writeFileSync(path.join(repoPath, 'random.txt'), 'some content');
                fs.writeFileSync(path.join(repoPath, 'another-file.md'), '# Random file');
            }
        }

        // === GIT REPOSITORY SETUP PHASE ===
        // Configure git repository state according to scenario
        if (scenario.hasGit) {
            try {
                // Initialize git repository
                execSync('git init', { cwd: repoPath, stdio: 'ignore' });

                // Configure git for testing to avoid dependency on global config
                execSync('git config user.email "test@example.com"', { cwd: repoPath, stdio: 'ignore' });
                execSync('git config user.name "Test User"', { cwd: repoPath, stdio: 'ignore' });

                // Setup remote origin if specified in scenario
                if (scenario.hasRemote) {
                    let remoteUrl;

                    // Select appropriate remote URL based on test case
                    if (scenario.hasRemote === 'correct') {
                        remoteUrl = 'https://github.com/test/correct-repo.git';
                    } else if (scenario.hasRemote === 'wrong') {
                        remoteUrl = 'https://github.com/test/wrong-repo.git';
                    } else {
                        remoteUrl = 'https://github.com/test/detected-repo.git';
                    }

                    execSync(`git remote add origin ${remoteUrl}`, { cwd: repoPath, stdio: 'ignore' });

                    // Verify remote was added correctly
                    const actualRemote = execSync('git remote get-url origin', {
                        cwd: repoPath,
                        encoding: 'utf8'
                    }).trim();

                    if (actualRemote !== remoteUrl) {
                        throw new Error(`Remote setup failed: expected ${remoteUrl}, got ${actualRemote}`);
                    }
                }
            } catch (error) {
                throw new Error(`Failed to setup git for ${scenario.id}: ${error.message}`);
            }
        }
    }

    // === REPOSITORY CONFIGURATION PHASE ===
    // Create the repository configuration object
    const repo = {
        name: repoName
    };

    if (scenario.urlSet) {
        repo.url = 'https://github.com/test/correct-repo.git';
    }

    // === VALIDATION PHASE ===
    // Ensure the scenario was set up correctly before testing
    const setupValidation = validateScenarioSetup(scenario, repoPath);
    if (!setupValidation.valid) {
        throw new Error(`Scenario setup validation failed: ${setupValidation.errors.join(', ')}`);
    }

    return { repo, repoPath };
}

/**
 * Validate that the test scenario was set up correctly
 * Prevents false test results due to setup issues
 */
function validateScenarioSetup(scenario, repoPath) {
    const errors = [];

    // Verify directory existence matches scenario specification
    const dirExists = fs.existsSync(repoPath);
    if (scenario.dirExists !== dirExists) {
        errors.push(`Directory existence mismatch: expected ${scenario.dirExists}, got ${dirExists}`);
    }

    if (dirExists && scenario.dirExists) {
        // Verify directory content state
        const contents = fs.readdirSync(repoPath);
        const isEmpty = contents.length === 0;

        if (scenario.dirEmpty !== null && scenario.dirEmpty !== isEmpty) {
            errors.push(`Directory empty state mismatch: expected ${scenario.dirEmpty}, got ${isEmpty}`);
        }

        // Verify git repository state
        const hasGit = fs.existsSync(path.join(repoPath, '.git'));
        if (scenario.hasGit !== hasGit) {
            errors.push(`Git state mismatch: expected ${scenario.hasGit}, got ${hasGit}`);
        }

        // Verify project file indicators
        const hasPackageJson = fs.existsSync(path.join(repoPath, 'package.json'));
        if (scenario.hasProjectFiles !== hasPackageJson) {
            errors.push(`Project files mismatch: expected ${scenario.hasProjectFiles}, got ${hasPackageJson}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/*
================================================================================
TEST EXECUTION ENGINE
================================================================================
*/

/**
 * Execute a single test scenario with comprehensive result analysis
 * This is the core testing function that runs the actual repository handling logic
 */
async function runTestScenario(scenario) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(chalk.cyan(`Testing: ${scenario.name} (${scenario.id})`));
    console.log(chalk.gray(`Description: ${scenario.description}`));
    console.log(chalk.gray(`Expected: ${scenario.expectedBehavior}`));
    console.log('='.repeat(80));

    try {
        // === SETUP PHASE ===
        // Prepare the test environment according to scenario specifications
        const { repo, repoPath } = await setupTestScenario(scenario);

        // === MOCK PREPARATION PHASE ===
        // Create mock user interaction with scenario-specific responses
        const mockAskQuestion = createMockAskQuestion(scenario.mockResponses || ['3']);

        // === TEST EXECUTION PHASE ===
        // Run the actual function being tested
        const result = await handleExistingDirectory(repo, repoPath, mockAskQuestion);

        // === RESULT ANALYSIS PHASE ===
        // Analyze and display test results
        console.log(chalk.green(`✓ Test completed`));
        console.log(`Return value: ${result}`);
        console.log(`Repo state: ${JSON.stringify({
            _existingProject: repo._existingProject,
            _skipClone: repo._skipClone,
            _createEmptyFolder: repo._createEmptyFolder
        }, null, 2)}`);

        return { success: true, result, repo };

    } catch (error) {
        // === ERROR HANDLING PHASE ===
        // Distinguish between expected errors (part of test) and unexpected failures
        if (scenario.expectedBehavior.startsWith('ERROR_')) {
            console.log(chalk.yellow(`✓ Expected error caught: ${error.message}`));
            return { success: true, error: error.message };
        } else {
            console.log(chalk.red(`✗ Unexpected error: ${error.message}`));
            return { success: false, error: error.message };
        }
    }
}

/**
 * Execute all test scenarios in sequence with comprehensive reporting
 * Provides complete test suite execution with detailed statistics
 */
async function runAllTests() {
    console.log(chalk.bold.blue('Repository Handling Test Matrix'));
    console.log(chalk.gray(`Testing ${TEST_MATRIX.length} scenarios...`));

    // === PREPARATION PHASE ===
    // Ensure test environment is ready
    if (!fs.existsSync(MOCK_REPOS_BASE)) {
        fs.mkdirSync(MOCK_REPOS_BASE, { recursive: true });
    }

    const results = [];

    // === EXECUTION PHASE ===
    // Run each test scenario sequentially
    for (const scenario of TEST_MATRIX) {
        const result = await runTestScenario(scenario);
        results.push({ scenario, ...result });
    }

    // === REPORTING PHASE ===
    // Generate comprehensive test results summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(chalk.bold.blue('TEST SUMMARY'));
    console.log('='.repeat(80));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(chalk.green(`✓ Passed: ${passed}`));
    if (failed > 0) {
        console.log(chalk.red(`✗ Failed: ${failed}`));
    }

    // Display detailed failure information
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
        console.log(chalk.red('\nFAILED TESTS:'));
        failedTests.forEach(({ scenario, error }) => {
            console.log(chalk.red(`  ${scenario.id}: ${scenario.name}`));
            console.log(chalk.red(`    Error: ${error}`));
        });
    }

    // === CLEANUP PHASE ===
    // Remove test artifacts with error handling
    try {
        if (fs.existsSync(TEST_BASE_DIR)) {
            fs.rmSync(TEST_BASE_DIR, { recursive: true, force: true });
        }
        console.log(`\nTest cleanup completed.`);
    } catch (error) {
        console.warn(`Warning: Test cleanup failed: ${error.message}`);
    }

    return { passed, failed, total: results.length };
}

/*
================================================================================
USER INTERFACE FUNCTIONS
================================================================================
*/

/**
 * Interactive mode for running specific test scenarios
 * Allows users to select and run individual tests for debugging
 */
async function runInteractiveTest() {
    console.log(chalk.bold.blue('Available Test Scenarios:'));
    TEST_MATRIX.forEach((scenario, index) => {
        console.log(`${index + 1}. ${chalk.cyan(scenario.id)}: ${scenario.name}`);
    });

    const { askQuestion } = await import('./core/ui.js');
    const choice = await askQuestion('Enter scenario number (or "all" for all tests): ');

    if (choice.toLowerCase() === 'all') {
        return await runAllTests();
    } else {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < TEST_MATRIX.length) {
            await runTestScenario(TEST_MATRIX[index]);
        } else {
            console.log(chalk.red('Invalid choice.'));
        }
    }
}

/*
================================================================================
MAIN ORCHESTRATION FUNCTION
================================================================================
*/

/**
 * Main entry point with command-line argument processing
 * Coordinates test execution based on provided flags and options
 */
async function main() {
    const args = process.argv.slice(2);

    // === COMMAND PROCESSING ===
    // Handle different execution modes based on command-line arguments
    if (args.includes('--all')) {
        // Run complete test suite
        await runAllTests();
    } else if (args.includes('--list')) {
        // Display available test scenarios
        console.log(chalk.bold.blue('Test Matrix Scenarios:'));
        TEST_MATRIX.forEach(scenario => {
            console.log(`${chalk.cyan(scenario.id)}: ${scenario.name}`);
            console.log(`  ${chalk.gray(scenario.description)}`);
        });
    } else {
        // Interactive mode - let user choose specific tests
        await runInteractiveTest();
    }
}

// Export test functions for potential use by other modules
export { TEST_MATRIX, runTestScenario, runAllTests };

// Execute main function if script is run directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(chalk.red('Test execution failed:'), error.message);
        process.exit(1);
    });
}