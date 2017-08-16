import { TestModel, Test } from "./vsTestModel";
import { VSTestSession } from "./vsTestSession";
import Event, { Emitter } from "./base/common/Event";
import { IVSTestConfig } from "./vsTestConfig";
const fs = require('fs');
const glob = require("glob")

/**
 * VSTest.console status
 */
export enum VSTestServiceStatus {
    Connected,
    Disconnected
}

/**
 * The test service responsible for update the model and start the vstest session
 */
export class VSTestService {
    /**
     * The test model that. Always updated!
     */
    protected testModel: TestModel;

    /**
     * Our current vstest session
     */
    protected session: VSTestSession;

    /**
     * Current configuration
     */
    protected config: IVSTestConfig;

    /**
     * Event notification about service status changes
     */
    protected _onDidTestServiceStatusChanged: Emitter<VSTestServiceStatus>;

    constructor(config : IVSTestConfig) {
        this.testModel = new TestModel();
        this._onDidTestServiceStatusChanged = new Emitter<VSTestServiceStatus>();
        this.config = config;
    }

    /**
     * Return our current test model
     */
    public getModel(): TestModel {
        return this.testModel;
    }

    public getSession(): VSTestSession {
        return this.session;
    }

    /**
     * Register a new listeener for the test service status change
     */
    public get onDidTestServiceStatusChanged(): Event<VSTestServiceStatus> {
        return this._onDidTestServiceStatusChanged.event;
    }

    /**
     * Start a new instance of the vstest session
     */
    public startTestRunner(): Promise<void> {
        return this.createSessionProcess();
    }

    /**
     * Create a new vstest sesssion process by starting a new process. Also send the initialize message
     */
    private createSessionProcess(): Promise<void> {
        this.session = new VSTestSession();
        this.registerSessionListeners();

        return this.session.initialize();
    }

    /**
     * Register the session listener to keep our model updated!
     */
    private registerSessionListeners() {
        this.session.onDidTestDiscovered((tests: Array<VSTestProtocol.TestCase>) => {
            tests.forEach((test) => {
                this.testModel.addTest(test);
            });
        });

        this.session.onDidTestSessionConnected(() => {
            //session connect, should call ui?
            this._onDidTestServiceStatusChanged.fire(VSTestServiceStatus.Connected);
        });

        this.session.onDidTestExecutionStatsChanged((testRunStatistics: VSTestProtocol.TestRunStatisticsResult) => {
            testRunStatistics.NewTestResults.forEach((newTestResult) => {
                this.getModel().updateTestResult(newTestResult);
            })
            testRunStatistics.ActiveTests.forEach((activeTest) => {
                this.getModel().updateTestState(activeTest);
            })
        });
    }

    /**
     * Retrieve all file in the directory that match the glob configuration
     * @param directory The base directory to lookup for the files
     */
    private listAllFilesInTestFolder(directory: string): Array<string> {
        let globPattern = `${directory}/**/*Tests.dll`;
        if(this.config.glob) {
            globPattern = `${directory}/${this.config.glob}`;
        }
        const fileTestList = glob.sync(globPattern, null);
        return fileTestList;
    }

    /**
     * Discover the files in the given directory
     * @param directory The directory path do discvery the tests
     */
    public discoveryTests(directory: string): Promise<VSTestProtocol.TestDiscoveryResult> {
        return new Promise((resolve, reject) => {
            try {
                const fileTestList = this.listAllFilesInTestFolder(directory);
                if(fileTestList.length === 0) {
                    resolve(null);
                    return;
                }
                this.session.discoveryTests(fileTestList);

                this.session.onDidTestDiscoveryCompleted((testDiscoveryResults) => {
                    resolve(testDiscoveryResults);
                })
            }
            catch (err) {
                //this.testRunnerOutputChannel.appendLine(err.message);
                reject();
            }
        });

    }

    /**
     * Run a set of tests 
     * @param tests The set of test to run
     * @param debuggingEnabled 
     */
    public runTests(tests: Array<Test>, debuggingEnabled: boolean = false): Promise<VSTestProtocol.TestRunCompleteResult> {
        if (!tests) {
            return Promise.resolve(null);
        }
        return new Promise((resolve, reject) => {
            try {
                const testCases = new Array<any>();
                let sources = new Array<string>();
                tests.forEach((test) => {
                    testCases.push(test.plainObject);
                    sources.push(test.source);
                })

                sources = sources.filter((v, i, a) => a.indexOf(v) === i);

                this.session.runTests(sources, testCases, debuggingEnabled);

                this.session.onDidTestExecutionCompleted((testExecutionResults) => {
                    resolve(testExecutionResults);
                })
            }
            catch (err) {
                //this.testRunnerOutputChannel.appendLine(err.message);
                reject();
            }
        });
    }

    public stopService() {
        return this.session.stopServer();
    }
}