
import { VSTestService, VSTestServiceStatus } from "../../vsTest/vsTestService";
import { VSTestServiceIDE } from "../vsTest/vsTestServiceIDE";
import * as vscode from "vscode";
import { config } from "../config";
import { TestOutputChannel } from "../console/testOutputChannel"
/**
 * Test Manager is too much here.. need to rethink this
 */
export class TestManager {
    private testService: VSTestServiceIDE;
    public testOutputChannel: TestOutputChannel;

    /**
     * The singleton TestManager
     */
    private static _instance: TestManager = null;

    /**
     * @returns the singleton TestManager
     */
    public static getInstance(): TestManager {
        return this._instance;
    }

    public getTestService(): VSTestService {
        return this.testService;
    }

    /**
     * Initialize the Test Manager
     * @param context The visual studio code context
     */
    public static initialize(context: vscode.ExtensionContext): void {
        this._instance = new TestManager(context);
    }

    constructor(private context: vscode.ExtensionContext) {
        this.testOutputChannel = new TestOutputChannel();

        this.start();
    }

    public start() {
        this.testService = new VSTestServiceIDE(config);
        this.testService.startTestRunner().then(() => {
            this.registerListener();
        });
    }

    public restart() {
        if (this.testService) {
            this.testService.stopService().then(() => {
                this.start();
            });
        }
        else {
            this.start();
        }

    }

    private registerListener() {
        this.testService.onDidTestServiceStatusChanged((serviceStatus) => {
            this.testOutputChannel.appendData(`Service Status: ${serviceStatus}`);
        });

        this.testService.getSession().onDidTestDiscoveryCompleted((testDiscoveryResult: VSTestProtocol.TestDiscoveryResult) => {
            if (testDiscoveryResult) {
                this.testOutputChannel.appendData(`Total test found: ${testDiscoveryResult.TotalTests}`);
            }
            else {
                this.testOutputChannel.appendData(`Total test found: 0. Error?`);
            }
        });

        this.testService.getSession().onDidTestExecutionCompleted((testRunCompleteResult: VSTestProtocol.TestRunCompleteResult) => {
            if (testRunCompleteResult) {
                this.testOutputChannel.appendData(`Total test time: ${testRunCompleteResult.TestRunCompleteArgs.ElapsedTimeInRunningTests}`);
                this.testOutputChannel.appendData(`Executed Tests: ${testRunCompleteResult.TestRunCompleteArgs.TestRunStatistics.ExecutedTests}`);
            }
        });

        this.testService.getSession().onDidTestSessionMessageReceived((message: VSTestProtocol.MessageResult) => {
            this.testOutputChannel.appendData(message.Message);
        });
    }
}