declare module VSTestProtocol {
    export interface ProtocolMessage {
        MessageType: string;
        Payload: any;
    }

    export interface Request extends ProtocolMessage {

    }

    export interface Response extends ProtocolMessage {

    }

    export interface StartDiscoveryRequest extends Request {
        // messageType = TestDiscovery.Start
        Payload: {
            Sources: Array<String>;
            RunSettings: string;
        }
    }

    export interface TestFoundResponse extends Response {
        // messageType = TestDiscovery.TestFound
        Payload: Array<TestCase>;
    }

    export interface Property {
        Key: {
            Id: string,
            Label: string,
            Category: string,
            Description: string,
            Attribute: string,
            ValueType: string,
        },
        Value: Object,
    }

    export interface TestCase {
        Properties: Array<Property>
    }

    export interface TestDiscoveryResult {
        TotalTests: number,
        IsAborted: boolean,
        LastDiscoveredTests: Array<TestCase>
    }

    export interface TestDiscoveryCompletedResponse extends Response {
        // messageType = TestDiscovery.Completed
        Payload: TestDiscoveryResult;
    }

    export interface RunTestsRequest extends Request {
        // messageType = TestExecution.RunAllWithDefaultHost
        Payload: {
            Sources: Array<String>,
            TestCases: Array<TestCase>,
            RunSettings: string,
            KeepAlive: boolean,
            DebuggingEnabled: boolean
        }
    }

    export interface TestResult {
        TestCase: TestCase,
        Attachments: Array<String>,
        Messages: Array<string>,
        Properties: Array<Property>
    }

    export interface TestRunStatistics {
        ExecutedTests,
        Stats
    }

    export interface TestRunStatisticsResult {
        NewTestResults: Array<TestResult>,
        ActiveTests: Array<TestCase>,
        TestRunStatistics: TestRunStatistics
    }

    export interface TestRunStatisticsResponse extends Request {
        // messageType = TestExecution.StatsChange
        Payload: TestRunStatisticsResult,
    }


    export interface TestRunCompleteResult {
        TestRunCompleteArgs: {
            TestRunStatistics: TestRunStatistics,
            IsCanceled: boolean,
            IsAborted: boolean,
            Error: string,
            AttachmentSets: Array<any>,
            ElapsedTimeInRunningTests: string
        }
        LastRunTests: TestRunStatisticsResult,
        RunAttachments: Array<any>,
        ExecutorUris: Array<any>,
    }


    export interface TestRunCompleteResponse extends Request {
        // messageType = TestExecution.Completed
        Payload: TestRunCompleteResult,
    }

    export interface MessageResult {
        Message : string,
        MessageLevel : number,
    }

    export interface MessageResponse extends Request {
        // messageType = TestSession.Message
        Payload: MessageResult,
    }


    export interface InitializeExtensionsRequest extends Request {
        // messageType = Extensions.Initialize
        Version : number
        /**
         * List of paths of extensions
         */
        Payload: Array<string>,
    }

    export interface VersionRequest extends Request {
        //"MessageType": "ProtocolVersion",
        Payload: number
    }

    export interface VersionResponse extends Response {
        //"MessageType": "ProtocolVersion",
        Payload: number,
    }
}
