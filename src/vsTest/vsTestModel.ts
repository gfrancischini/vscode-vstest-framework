import Event, { Emitter } from "./base/common/Event";
import * as Collections from "typescript-collections";

export enum TestOutcome {
    //None. Test case doesn't have an outcome.
    None = 0x0,
    //Passed
    Passed = 0x1,
    //Failed
    Failed = 0x2,
    //Skipped
    Skipped = 0x3,
    //Not found. Test case was not found during execution.
    NotFound = 0x4,
}

/**
 * Class that handle the test results
 */
export class TestResult {
    /**
     * TestResult.DisplayName provides a friendly name for the test result.
     */
    displayName: string;

    /**
     * TestResult.Duration provides the entire duration of this test case execution.
     */
    duration: string;

    /**
     * TestResult.ErrorMessage provides an error message if the test failed.
     */
    errorMessage: string;

    /**
     * TestResult.ErrorStackTrace provides the stack trace for the error.
     */
    errorStackTrace: string;

    /**
     * TestResult.Outcome provides an integer specifying the result of a test case execution. Possible outcomes are:
        0x0: None. Test case doesn't have an outcome.
        0x1: Passed
        0x2: Failed
        0x3: Skipped
        0x4: Not found. Test case was not found during execution.
     */
    outcome: TestOutcome;

    /**
     * TestResult.StartTime provides the start time of the test case execution.
     */
    startTime: Date;

    /**
     * TestResult.EndTime provides the end time of test case execution.
     */
    endTime: Date;

    /**
     * The plain test result object
     */
    plainObject: VSTestProtocol.TestResult;

    public getDurationInMilliseconds() : number {
        return this.endTime.getTime() - this.startTime.getTime();
    }
}

/**
 * The test case implementation
 */
export class Test {
    /**
     * The unique id of the test
     */
    id: string;

    /**
     * TestCase.FullyQualifiedName represents the unique name for a test case.
     */
    fullyQualifiedName: string;

    /**
     * TestCase.ExecutorUri represents the Adapter which owns this test case.
     */
    executorUri: string;

    /**
     * TestCase.Source is the path to the test container which contains the source of this test case.
     */
    source: string;

    /**
     * TestCase.DisplayName represents a user friendly notation for the test case. An editor or a runner can choose to show this to user.
     */
    displayName: string;

    /**
     * Is the test enabled for running
     */
    isEnabled: boolean

    /**
     * The name of the test class
     */
    testClassName: string;

    /**
     * Line number where the test lies
     */
    lineNumber: number;

    /**
     * The source file of the test
     */
    codeFilePath: string;

    /**
     * TestCase.Traits are a set of <Key, Value> pair of additional data related to a test case. User can use these values to filter tests. An editor or runner may show this to user.
     */
    traits: string;

    /**
     * The test result
     */
    result: TestResult;

    /**
     * Plain test object
     */
    plainObject: VSTestProtocol.TestCase;

    isRunning : boolean = false;
    

    /**
     * Return the unique test id
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Return the test display name
     */
    public getDisplayName(): string {
        if (this.result) {
            return `${this.displayName} - ${this.result.getDurationInMilliseconds()} ms`;
        }
        return this.displayName;
    }

    /**
     * Return the line number where the test lies
     */
    public getLineNumber(): number {
        return this.lineNumber;
    }

    /**
     * Return the source code of the test
     */
    public getCodeFilePath(): string {
        return this.codeFilePath;
    }

    /**
     * Return any test children
     */
    public getChildren(): Array<Test> {
        return null;
    }

    /**
     * Return the test result
     */
    public getResult(): TestResult {
        return this.result
    }
}

export class TestModel {
    /**
     * Collection of tests discovered on the solution
     */
    private tests: Collections.Dictionary<string, Test> = new Collections.Dictionary<string, Test>();

    /**
     * Event notification emitted when test case change (new test, update)
     */
    private _onDidTestChanged: Emitter<Test>;

    public constructor() {
        this._onDidTestChanged = new Emitter<Test>();
    }

    /**
     * Return a array list of all test available
     */
    public getTests(): Array<Test> {
        return this.tests.values();
    }

    /**
     * Return a array list of all failed tests
     */
    public getFailedTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && test.result.outcome === TestOutcome.Failed) {
                return true;
            }
            return false
        });
        return tests;
    }

     /**
     * Return a array list of all passed tests
     */
    public getPassedTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && test.result.outcome === TestOutcome.Passed) {
                return true;
            }
            return false
        });
        return tests;
    }

     /**
     * Return a array list of all not run tests
     */
    public getNotRunTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (!test.result || test.result.outcome === TestOutcome.None) {
                return true;
            }
            return false;
        });
        return tests;
    }

    /**
     * Register a new listeener for the test changed
     */
    public get onDidTestChanged(): Event<Test> {
        return this._onDidTestChanged.event;
    }

    /**
     * Update a test by assigning a result
     * @param testResult 
     */
    public updateTestResult(testResult: VSTestProtocol.TestResult) {
        const test = this.createTest(testResult.TestCase);
        test.result = this.createTestResult(testResult);

        this.tests.setValue(test.id, test);
        this._onDidTestChanged.fire(test);
    }

    /**
     * Create a testresult based on the protocol
     * @param testResult
     */
    private createTestResult(testResult: VSTestProtocol.TestResult): TestResult {
        const newTestResult: TestResult = new TestResult();
        newTestResult.plainObject = testResult;

        testResult.Properties.forEach(properties => {
            switch (properties.Key.Id) {
                case "TestResult.Outcome":
                    newTestResult.outcome = parseInt(properties.Value, 10);
                    break;
                case "TestResult.ErrorMessage":
                    newTestResult.errorMessage = properties.Value;
                    break;
                case "TestResult.ErrorStackTrace":
                    newTestResult.errorStackTrace = properties.Value;
                    break;
                case "TestResult.DisplayName":
                    newTestResult.displayName = properties.Value;
                    break;
                case "TestResult.ComputerName":
                    //newTestResult.computerName = properties.Value;
                    break;
                case "TestResult.Duration":
                    newTestResult.duration = properties.Value;
                    break;
                case "TestResult.StartTime":
                    newTestResult.startTime = new Date(properties.Value);
                    break;
                case "TestResult.EndTime":
                    newTestResult.endTime = new Date(properties.Value);
                    break;
            }
        });
        return newTestResult;
    }


    /**
     * Create a test based on the protocol
     * @param test 
     */
    public createTest(test: VSTestProtocol.TestCase): Test {
        const newTest = new Test();
        newTest.plainObject = test;
        test.Properties.forEach(properties => {
            switch (properties.Key.Id) {
                case "TestCase.FullyQualifiedName":
                    newTest.fullyQualifiedName = properties.Value;
                    break;
                case "TestCase.ExecutorUri":
                    newTest.executorUri = properties.Value;
                    break;
                case "TestCase.Source":
                    newTest.source = properties.Value;
                    break;
                case "TestCase.DisplayName":
                    newTest.displayName = properties.Value;
                    break;
                case "MSTestDiscovererv2.IsEnabled":
                    newTest.isEnabled = (properties.Value.toLowerCase() == "true");
                    break;
                case "MSTestDiscovererv2.TestClassName":
                    newTest.testClassName = properties.Value;
                    break;
                case "TestCase.LineNumber":
                    newTest.lineNumber = parseInt(properties.Value, 10);
                    break;
                case "TestCase.Traits":
                    newTest.traits = properties.Value;
                    break;
                case "TestCase.Id":
                    newTest.id = properties.Value;
                    break;
                case "TestCase.CodeFilePath":
                    newTest.codeFilePath = properties.Value;
                    break;
            }
        });
        return newTest;
    }

    /**
     * Add a new test to the collection
     * @param test 
     */
    public addTest(test: VSTestProtocol.TestCase): void {
        const newTest: Test = this.createTest(test);
        this.tests.setValue(newTest.id, newTest);
        this._onDidTestChanged.fire(newTest);
    }

    public updateTestState(test: VSTestProtocol.TestCase) : void {
        const newTest: Test = this.createTest(test);
        newTest.isRunning = true;
        this.tests.setValue(newTest.id, newTest);
        this._onDidTestChanged.fire(newTest);
    }

}