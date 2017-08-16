import cp = require("child_process");
import { TPromise } from "./base/common/winjs.base";
import Event, { Emitter } from "./base/common/Event";
import net = require("net");
import stream = require("stream");
import { BinaryReader } from "./binary/binaryReader";
import { BinaryWriter } from "./binary/binaryWriter";
import { RawProtocolSession } from "./rawProtocolSession";

/**
 * Implements the VSTest Protocol
 */
export class VSTestSession extends RawProtocolSession {
    private _onDidTestSessionConnected: Emitter<void>;
    private _onDidTestDiscovered: Emitter<Array<VSTestProtocol.TestCase>>;
    private _onDidTestDiscoveryCompleted: Emitter<VSTestProtocol.TestDiscoveryResult>;
    private _onDidTestExecutionStatsChanged: Emitter<VSTestProtocol.TestRunStatisticsResult>;
    private _onDidTestExecutionCompleted: Emitter<VSTestProtocol.TestRunCompleteResult>;
    private _onDidTestSessionMessageReceived: Emitter<VSTestProtocol.MessageResult>;

    DefaultRunSettings: string = "<RunSettings><TargetFrameworkVersion>.NETCoreApp,Version=v1.0</TargetFrameworkVersion></RunSettings>";

    constructor() {
        super();
        this._onDidTestSessionConnected = new Emitter<void>();
        this._onDidTestDiscovered = new Emitter<Array<VSTestProtocol.TestCase>>();
        this._onDidTestDiscoveryCompleted = new Emitter<VSTestProtocol.TestDiscoveryResult>();
        this._onDidTestExecutionStatsChanged = new Emitter<VSTestProtocol.TestRunStatisticsResult>();
        this._onDidTestExecutionCompleted = new Emitter<VSTestProtocol.TestRunCompleteResult>();
        this._onDidTestSessionMessageReceived = new Emitter<VSTestProtocol.MessageResult>();
    }

    public get onDidTestSessionConnected(): Event<void> {
        return this._onDidTestSessionConnected.event;
    }

    public get onDidTestExecutionCompleted(): Event<VSTestProtocol.TestRunCompleteResult> {
        return this._onDidTestExecutionCompleted.event;
    }

    public get onDidTestExecutionStatsChanged(): Event<VSTestProtocol.TestRunStatisticsResult> {
        return this._onDidTestExecutionStatsChanged.event;
    }

    public get onDidTestDiscovered(): Event<Array<VSTestProtocol.TestCase>> {
        return this._onDidTestDiscovered.event;
    }

    public get onDidTestDiscoveryCompleted(): Event<VSTestProtocol.TestDiscoveryResult> {
        return this._onDidTestDiscoveryCompleted.event;
    }

    public get onDidTestSessionMessageReceived(): Event<VSTestProtocol.MessageResult> {
        return this._onDidTestSessionMessageReceived.event;
    }

    /**
     * Parses and notify listener for the received message 
     * @param message The message rcv
     */
    protected onProtocolMessage(message: VSTestProtocol.ProtocolMessage): void {
        switch (message.MessageType) {
            case "TestSession.Connected":
                this._onDidTestSessionConnected.fire();
                break;
            case "TestDiscovery.TestFound":
                this._onDidTestDiscovered.fire(<Array<VSTestProtocol.TestCase>>message.Payload);
                break;
            case "TestDiscovery.Completed":
                this._onDidTestDiscoveryCompleted.fire(<VSTestProtocol.TestDiscoveryResult>message.Payload);
                break;
            case "TestExecution.StatsChange":
                this._onDidTestExecutionStatsChanged.fire(<VSTestProtocol.TestRunStatisticsResult>message.Payload);
                break;
            case "TestExecution.Completed":
                this._onDidTestExecutionCompleted.fire(<VSTestProtocol.TestRunCompleteResult>message.Payload);
                break;
            case "TestSession.Message":
                this._onDidTestSessionMessageReceived.fire(<VSTestProtocol.MessageResult>message.Payload);
                break;
            default:
                console.log(message);
        }
    }


    /**
     * Initialize the Test Session
     */
    public initialize(): Promise<void> {
        const lib = "vstest";// "C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\src\\vstest.console\\bin\\Debug\\netcoreapp2.0\\vstest";
        //const frameWork = "/Framework:FrameworkCore10";
        const processId = `/parentprocessid:${process.pid}`;
        const portNumber = 12345; //TODO - get free port number
        const port = `/port:${portNumber}`;
        const diag = `/Diag:C:\\Users\\gfrancischini\\Downloads\\Log.txt`;
        
        return new Promise<void>((resolve, reject) => {
            this.launchServer({ command: "dotnet", args: [lib, processId, port, diag] }, portNumber).then(() => {
                this.onDidTestSessionConnected(() => {
                    this.initializeExtensions();
                    resolve();
                });
            });
        });
    }

    /**
     * Send a initialize extensions request to the test host
     */
    public initializeExtensions() {
        var initializeExtensionsRequest: VSTestProtocol.InitializeExtensionsRequest = {
            MessageType: "Extensions.Initialize",
            Payload: new Array<string>()
        };

        initializeExtensionsRequest.Payload.push("C:\\Program Files (x86)\\Microsoft Visual Studio 14.0\\Common7\\IDE\\Extensions\\Microsoft\Node.js Tools for Visual Studio\\1.3\\Microsoft.NodejsTools.TestAdapter.dll");

        this.sendProtocolMessage(initializeExtensionsRequest);
    }

    /**
     * Run a set of tests
     * @param sources 
     * @param tests 
     * @param debuggingEnabled 
     */
    public runTests(sources: Array<String>, tests: Array<VSTestProtocol.TestCase>, debuggingEnabled: boolean) {
        const runTestsRequest: VSTestProtocol.RunTestsRequest = {
            MessageType: "TestExecution.RunAllWithDefaultHost",
            Payload: {
                Sources: null,
                TestCases: tests,
                RunSettings: null,
                KeepAlive: false,
                DebuggingEnabled: debuggingEnabled
            }
        }
        this.sendProtocolMessage(runTestsRequest);
    }


    /**
     * Discovery the test on the underline sources
     * @param sources 
     */
    public discoveryTests(sources: Array<string>) {
        var discoveryRequest: VSTestProtocol.StartDiscoveryRequest = {
            MessageType: "TestDiscovery.Start",
            Payload: {
                Sources: sources,
                RunSettings: this.DefaultRunSettings
            }
        }
        this.sendProtocolMessage(discoveryRequest);
    }
}

