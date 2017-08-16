import * as vscode from "vscode";
import { VSTestServiceIDE } from "../vsTest/vsTestServiceIDE"
import { TestManager } from "../vsTest/vsTestManager";
import { TestModel, Test, TestResult, TestOutcome } from "../../vsTest/vsTestModel"

export function RegisterTestExecutionCommands(context: vscode.ExtensionContext) {
    new TestExecutionCommands(context);
}

export class TestExecutionCommands {
    private testService: VSTestServiceIDE;
    constructor(private context: vscode.ExtensionContext) {
        this.testService = TestManager.getInstance().getTestService();

        const runCommand = vscode.commands.registerCommand("vstest.execution.run",
            test => this.runTests([test]));
        context.subscriptions.push(runCommand);

        const runAllCommand = vscode.commands.registerCommand("vstest.execution.runAll",
            test => this.runTests(this.testService.getModel().getTests()));
        context.subscriptions.push(runAllCommand);

        const debugCommand = vscode.commands.registerCommand("vstest.execution.debug",
            test => this.runTests([test], true));
        context.subscriptions.push(debugCommand);

        const debugAllCommand = vscode.commands.registerCommand("vstest.execution.debugAll",
            test => this.runTests(this.testService.getModel().getTests(), true));
        context.subscriptions.push(debugAllCommand);
    }


    runTests(test: Array<Test>, debuggingEnabled: boolean = false): void {
        this.testService.runTests(test, debuggingEnabled);
    }


}