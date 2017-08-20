import { TestModel, Test } from "./vsTestModel";
import { VSTestSession } from "./vsTestSession";
import Event, { Emitter } from "./base/common/Event";
import { IVSTestConfig } from "./vsTestConfig";
const fs = require('fs');
const glob = require("glob");

import { VSTestDotNetModel } from "../vsTestDotNet/vsTestDotNetModel";

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

    protected workspace: string;

    /**
     * Event notification about service status changes
     */
    protected _onDidTestServiceStatusChanged: Emitter<VSTestServiceStatus>;

    constructor(workspace: string, adapterName: string, config: IVSTestConfig) {

        this.updateConfiguration(adapterName, config);

        this._onDidTestServiceStatusChanged = new Emitter<VSTestServiceStatus>();

        this.workspace = workspace;

    }

    public updateConfiguration(adapterName: string, config: IVSTestConfig) {
        //TODO add list of adapter supported
        if (adapterName == "dotnet") {
            this.testModel = new VSTestDotNetModel(config);
        }
        else {
            this.testModel = new TestModel(config);
        }
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

        return this.session.initialize(this.workspace, this.getAdditionalTestAdapters());
    }

    private getAdditionalTestAdapters(): Array<string> {
        return this.getModel().getAdditionalTestAdapters(this.workspace);
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
     * Discover the files in the given directory
     * @param directory The directory path do discvery the tests
     */
    public discoveryTests(directory: string): Promise<VSTestProtocol.TestDiscoveryResult> {
        return new Promise((resolve, reject) => {
            try {
                this.getModel().reset();

                const sourcesToDiscovery = this.getModel().getAllFilesInTestFolder(directory);
                if (sourcesToDiscovery[0].files.length === 0) {
                    resolve(null);
                    return;
                }

                this.session.discoveryTests(sourcesToDiscovery[0].files, sourcesToDiscovery[0].runSettings);

                this.session.onDidTestDiscoveryCompleted((testDiscoveryResults) => {
                    if (testDiscoveryResults.LastDiscoveredTests) {
                        testDiscoveryResults.LastDiscoveredTests.forEach((testCase: VSTestProtocol.TestCase) => {
                            this.getModel().addTest(testCase);
                        });
                    }

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
                this.testModel.incrementRunTestSessionId();
                const testCases = new Array<any>();
                let sources = new Array<string>();
                tests.forEach((test) => {
                    testCases.push(test.plainObject);
                    sources.push(test.source);
                })

                sources = sources.filter((v, i, a) => a.indexOf(v) === i);

                this.session.runTests(sources, testCases, this.getModel().getRunSettings(), debuggingEnabled);

                this.session.onDidTestExecutionCompleted((testExecutionResults) => {
                    if(testExecutionResults.LastRunTests) {
                        testExecutionResults.LastRunTests.NewTestResults.forEach((testResult : VSTestProtocol.TestResult) => {
                            this.getModel().updateTestResult(testResult);
                        })
                    }
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