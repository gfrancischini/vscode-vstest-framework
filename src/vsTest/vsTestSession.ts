import cp = require("child_process");
import { TPromise } from "./base/common/winjs.base";
import Event, { Emitter } from "./base/common/Event";
import net = require("net");
import stream = require("stream");
import { BinaryReader } from "./binary/binaryReader";
import { BinaryWriter } from "./binary/binaryWriter";
//import * as jsonUtils from "./jsonUtils";
export interface IAdapterExecutable {
    command?: string;
    args?: string[];
}

export class VSTestSession {
    private serverProcess: cp.ChildProcess;
    public disconnected: boolean;
    private cachedInitServer: TPromise<void>;
    private startTime: number;
    private socket: net.Socket = null;

    private outputStream: stream.Writable;
    private rawData: Buffer;

    private _onDidTestSessionConnected: Emitter<void>;
    private _onDidTestDiscovered: Emitter<Array<VSTestProtocol.TestCase>>;
    private _onDidTestDiscoveryCompleted: Emitter<VSTestProtocol.TestDiscoveryResult>;
    private _onDidTestExecutionStatsChanged: Emitter<VSTestProtocol.TestRunStatisticsResult>;
    private _onDidTestExecutionCompleted: Emitter<VSTestProtocol.TestRunCompleteResult>;
    private _onDidTestSessionMessageReceived: Emitter<VSTestProtocol.MessageResult>;

    private binaryReader: BinaryReader;
    constructor() {
        this.rawData = new Buffer(0);
        this._onDidTestSessionConnected = new Emitter<void>();
        this._onDidTestDiscovered = new Emitter<Array<VSTestProtocol.TestCase>>();
        this._onDidTestDiscoveryCompleted = new Emitter<VSTestProtocol.TestDiscoveryResult>();
        this._onDidTestExecutionStatsChanged = new Emitter<VSTestProtocol.TestRunStatisticsResult>();
        this._onDidTestExecutionCompleted = new Emitter<VSTestProtocol.TestRunCompleteResult>();
        this._onDidTestSessionMessageReceived = new Emitter<VSTestProtocol.MessageResult>();
        this.binaryReader = new BinaryReader();
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


    private createSocketServer() {
        // Begin listening to stderr pipe
        let stdServer = net.createServer((socket) => {
            this.socket = socket;
            this.socket.on('data', (data) => {
                this.binaryReader.append(data);
                do {
                    var msg = this.binaryReader.ReadString();

                    if (msg && msg.toString() !== "") {
                        this.dispatch(msg.toString());
                    }
                } while (msg);
            });
        });
        stdServer.listen(12345);


    }

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
                console.log(message.Payload);
                break;
            default:
                console.log(message);
        }
    }

    private dispatch(body: string): void {
        try {
            const rawData = <VSTestProtocol.ProtocolMessage>JSON.parse(body);
            this.onProtocolMessage(rawData);
			/*switch (rawData.type) {
				case 'event':
					this.onEvent(<TestRunnerProtocol.Event>rawData);
					break;
				case 'response':
					const response = <TestRunnerProtocol.Response>rawData;
					const clb = this.pendingRequests.get(response.request_seq);
					if (clb) {
						this.pendingRequests.delete(response.request_seq);
						clb(response);
					}
					break;
				case 'request':
					const request = <TestRunnerProtocol.Request>rawData;
					const resp: TestRunnerProtocol.Response = {
						type: 'response',
						seq: 0,
						command: request.command,
						request_seq: request.seq,
						success: true
					};
					this.dispatchRequest(request, resp);
					break;
			}*/
        } catch (e) {
            this.onServerError(new Error(e.message || e));
            console.log(e);
        }
    }

    public initialize() {
        const lib = "vstest";// "C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\src\\vstest.console\\bin\\Debug\\netcoreapp2.0\\vstest";
        //const frameWork = "/Framework:FrameworkCore10";
        const processId = `/parentprocessid:${process.pid}`;
        const port = `/port:12345`;
        const diag = `/Diag:C:\\Users\\gfrancischini\\Downloads\\Log.txt`;
        this.createSocketServer();
        return new Promise<void>((resolve, reject) => {
            this.launchServer({ command: "dotnet", args: [lib, processId, port, diag] }).then(() => {
                this.serverProcess.on("error", (err: Error) => this.onServerError(err));
                this.serverProcess.on("exit", (code: number, signal: string) => {
                    this.onServerExit();
                });
                this.serverProcess.stderr.on("data", (data: string) => {
                    console.log(data.toString());
                });
                this.connect(this.serverProcess.stdout, this.serverProcess.stdin);

                this.onDidTestSessionConnected(() => {
                    //this.initializeExtensions();
                    resolve();
                });
            });
        });
    }

    protected connect(readable: stream.Readable, writable: stream.Writable): void {

        this.outputStream = writable;

        readable.on('data', (data: Buffer) => {
            this.rawData = Buffer.concat([this.rawData, data]);
            console.log(data.toString());
        });
    }

    public launchServer(launch: IAdapterExecutable): TPromise<void> {
        return new TPromise<void>((complete, e) => {
            this.serverProcess = cp.spawn(launch.command, launch.args, {
                stdio: [
                    "pipe", 	// stdin
                    "pipe", 	// stdout
                    "pipe"		// stderr
                ],
            });
            complete(null);
        });
    }

    protected onServerError(err: Error): void {
        // this.messageService.show(severity.Error, nls.localize("stoppingDebugAdapter", "{0}. Stopping the debug adapter.", err.message));
        this.stopServer().done(null/*, errors.onUnexpectedError*/);

        console.log("onServerError");
    }

    private onServerExit(): void {
        this.serverProcess = null;
        this.cachedInitServer = null;
        if (!this.disconnected) {
            // this.messageService.show(severity.Error, nls.localize("debugAdapterCrash", "Debug adapter process has terminated unexpectedly"));
        }
        //this.onEvent({ event: "exit", type: "event", seq: 0 });

        console.log("onServerExit");
    }

    public stopServer(): TPromise<any> {

        if (this.socket !== null) {
            this.socket.end();
            this.cachedInitServer = null;
        }

        //this.onEvent({ event: "exit", type: "event", seq: 0 });
        if (!this.serverProcess) {
            return TPromise.as(null);
        }

        this.disconnected = true;

        let ret: TPromise<void>;
        // when killing a process in windows its child
        // processes are *not* killed but become root
        // processes. Therefore we use TASKKILL.EXE
        if (/*platform.isWindows*/true) {
            ret = new TPromise<void>((c, e) => {
                const killer = cp.exec(`taskkill /F /T /PID ${this.serverProcess.pid}`, function (err, stdout, stderr) {
                    if (err) {
                        return e(err);
                    }
                });
                killer.on("exit", c);
                killer.on("error", e);
            });
        }/* else {
			this.serverProcess.kill("SIGTERM");
			ret = TPromise.as(null);
		}*/

        return ret;
    }


    public initializeExtensions() {
        var initializeExtensionsRequest: VSTestProtocol.InitializeExtensionsRequest = {
            MessageType: "Extensions.Initialize",
            Payload: new Array<string>()
        };

        initializeExtensionsRequest.Payload.push("C:\\Program Files (x86)\\Microsoft Visual Studio 14.0\\Common7\\IDE\\Extensions\\Microsoft\Node.js Tools for Visual Studio\\1.3\\Microsoft.NodejsTools.TestAdapter.dll");

        this.sendProtocolMessage(initializeExtensionsRequest);
    }

    public runTests(sources: Array<String>, tests: Array<VSTestProtocol.TestCase>, debuggingEnabled: boolean) {
        const runTestsRequest: VSTestProtocol.RunTestsRequest = {
            MessageType: "TestExecution.RunAllWithDefaultHost",
            Payload: {
                Sources: sources,
                TestCases: tests,
                RunSettings: null,
                KeepAlive: false,
                DebuggingEnabled: debuggingEnabled
            }
        }

        //runTestsRequest.Payload.Sources.push("C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\test\\testhost.UnitTests\\bin\\Debug\\netcoreapp1.0\\testhost.UnitTests.dll");

        this.sendProtocolMessage(runTestsRequest);
    }

    DefaultRunSettings : string = "<RunSettings><TargetFrameworkVersion>.NETCoreApp,Version=v1.0</TargetFrameworkVersion></RunSettings>";

    public discoverTests(directories: Array<string>) {
        var discoveryRequest: VSTestProtocol.StartDiscoveryRequest = {
            MessageType: "TestDiscovery.Start",
            Payload: {
                Sources: directories,
                RunSettings: this.DefaultRunSettings
            }
        }
        //discoveryRequest.Payload.Sources.push("C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\test\\testhost.UnitTests\\bin\\Debug\\netcoreapp1.0");

        //discoveryRequest.Payload.Sources.push("C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\test\\testhost.UnitTests\\bin\\Debug\\netcoreapp1.0\\testhost.UnitTests.dll");
        //discoveryRequest.Payload.Sources.push("C:\\Users\\gfrancischini\\source\\repos\\NodejsConsoleApp1\\NodejsConsoleApp1\\UnitTest2.ts");
        //discoveryRequest.Payload.Sources.push("C:\\Users\\gfrancischini\\source\\repos\\NodejsConsoleApp1\\NodejsConsoleApp1\\NodejsConsoleApp1.njsproj");


        this.sendProtocolMessage(discoveryRequest);
    }

    protected sendProtocolMessage(message: VSTestProtocol.ProtocolMessage) {
        var stringifyMessage = JSON.stringify(message);
        var writer = new BinaryWriter();
        //stringifyMessage = '{\"MessageType\":\"TestDiscovery.Start\",\"Payload\":{\"Sources\":[\"C:\\\\Users\\\\gfrancischini\\\\Desktop\\\\vstest-rel-15.3-rtm\\\\test\\\\testhost.UnitTests\\\\bin\\\\Debug\\\\netcoreapp1.0\\\\testhost.UnitTests.dll\"],\"RunSettings\":null}}';

        writer.WriteString(stringifyMessage);
        //writer.WriteUInt8(stringifyMessage.length);
        //writer.WriteBytes(stringifyMessage);
        this.socket.write(writer.byteBuffer);
    }
}

