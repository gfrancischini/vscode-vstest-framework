import * as vscode from "vscode";
import * as Utils from "../Utils";
import * as Collections from "typescript-collections";
import { TestManager } from "../vsTest/vsTestManager";
import { TestModel, Test, TestResult, TestOutcome } from "../../vsTest/vsTestModel"
import { VSTestServiceIDE } from "../vsTest/vsTestServiceIDE"
export function RegisterVSTestTreeProvider(context: vscode.ExtensionContext) {
    let testTreeDataProvider: TestTreeDataProvider;
    testTreeDataProvider = new TestTreeDataProvider(context);
    vscode.window.registerTreeDataProvider("vstest.explorer.vsTestTree", testTreeDataProvider);
}

/**
 * A class to handle the group lables of the tests
 */
class Label {
    private tests: Array<Test>;

    private displayName: string;

    private outcome: TestOutcome;



    constructor(displayName: string, outcome: TestOutcome, tests: Array<Test> = null) {
        this.displayName = displayName;
        this.tests = tests;
        this.outcome = outcome;
    }

    public getChildrenLenght(): number {
        return this.getChildren() ? this.getChildren().length : 0;
    }

    public getDisplayName() {
        return `${this.displayName} (${this.getChildrenLenght()})`;
    }

    public setTests(tests: Array<Test>) {
        this.tests = tests;
    }

    public getChildren(): Array<Test> {
        return this.tests;
    }

    public getOutcome(): TestOutcome {
        return this.outcome;
    }

    public getId(): string {
        return this.displayName;
    }
}

/**
 * Type that the tree provider handles
 */
type TestTreeType = Label | Test;

/**
 * Additional data to help the tree data provider
 */
class TestAdditionalData {
    collapsibleState: vscode.TreeItemCollapsibleState;
}

export class TestTreeDataProvider implements vscode.TreeDataProvider<TestTreeType> {
    public _onDidChangeTreeData: vscode.EventEmitter<TestTreeType | null> = new vscode.EventEmitter<TestTreeType | null>();
    readonly onDidChangeTreeData: vscode.Event<TestTreeType | null> = this._onDidChangeTreeData.event;

    

    private testService: VSTestServiceIDE;

    private testsAdditionalData: Collections.Dictionary<string, TestAdditionalData> = new Collections.Dictionary<string, TestAdditionalData>();

    private selectedItem: TestTreeType = null;

    private anyTestFound: boolean = false;

    constructor(private context: vscode.ExtensionContext) {

        const disposable = vscode.commands.registerCommand("vstest.explorer.open", event => this.goToTestLocation(event));
        context.subscriptions.push(disposable);

        const runCommand = vscode.commands.registerCommand("vstest.execution.runSelected",
            test => this.runTests());
        context.subscriptions.push(runCommand);

        const debugCommand = vscode.commands.registerCommand("vstest.execution.debugSelected",
            test => this.runTests(true));
        context.subscriptions.push(debugCommand);

        const restartExplorerCommand = vscode.commands.registerCommand("vstest.explorer.restart",
            test => TestManager.getInstance().restart());
        context.subscriptions.push(restartExplorerCommand);

        const showTestResult = vscode.commands.registerCommand("vstest.explorer.showResult", event => this.showTestResult(event));
        context.subscriptions.push(showTestResult);

        this.initialize();
    }

    private initialize() {
        this.testService = TestManager.getInstance().getTestService();

        this.testService.onDidTestServiceStatusChanged(() => {
            this.testService.discoverTests(vscode.workspace.rootPath).then((result) => {
                if (!result) {
                    this.anyTestFound = false;
                    this._onDidChangeTreeData.fire();
                }
                else {
                    this.anyTestFound = true;
                }
            })
        });

        this.testService.getModel().onDidTestChanged((test: Test) => {
            this._onDidChangeTreeData.fire();
            this.refrehTestExplorer(null);
        });
    }

    private runTests(debuggingEnabled: boolean = false): void {
        if (this.selectedItem instanceof Test) {
            this.testService.runTests([<Test>this.selectedItem], debuggingEnabled);
        }
    }

    private refrehTestExplorer(test: Test) {
        this._onDidChangeTreeData.fire(test);
    }

    private getTestsByOutcome() {
        if (!this.testService.getModel().getTests() || this.testService.getModel().getTests().length === 0) {
            const noTestFoundLabel: Label = new Label("No Test Found", TestOutcome.None, null);
            return Promise.resolve([noTestFoundLabel]);
        }


        return new Promise<Array<TestTreeType>>((resolve, reject) => {
            const outcomeArray = new Array<TestTreeType>();

            const testModel: TestModel = this.testService.getModel();

            const notRunTestsLabel: Label = new Label("Not Run Tests", TestOutcome.None, testModel.getNotRunTests());
            const failedTestsLabel: Label = new Label("Failed Tests", TestOutcome.Failed, testModel.getFailedTests());
            const passedTests: Label = new Label("Passed Tests", TestOutcome.Passed, testModel.getPassedTests());

            this.testsAdditionalData.setValue(notRunTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(failedTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(passedTests.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });

            // only add filters if there is children to display
            if (notRunTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(notRunTestsLabel);
            }
            if (failedTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(failedTestsLabel);
            }
            if (passedTests.getChildrenLenght() > 0) {
                outcomeArray.push(passedTests);
            }

            resolve(outcomeArray);

        });
    }

    getChildren(test?: TestTreeType): Thenable<TestTreeType[]> {
        if (test) {
            return Promise.resolve(test.getChildren() ? test.getChildren() : []);
        }
        else {
            return this.getTestsByOutcome();
        }
    }

    getTreeItem(item: TestTreeType): vscode.TreeItem {
        return <vscode.TreeItem>{
            label: this.getLabel(item),
            collapsibleState: this.getItemCollapsibleState(item),
            command: {
                command: "vstest.explorer.open",
                arguments: [item],
                title: this.getLabel(item),
            },
            iconPath: this.getIcon(item)
        };
    }

    private getLabel(testCase: TestTreeType): string {
        return testCase.getDisplayName();
    }

    private getIcon(item: TestTreeType) {
        if (item instanceof Label) {
            return null;
        }

        if (item instanceof Test) {
            if (!item.getResult() && item.isRunning) {
                return Utils.getImageResource("progress.svg");
            }
            const outcome = item.getResult() ? item.getResult().outcome : TestOutcome.None;
            switch (outcome) {
                case TestOutcome.Failed:
                    return Utils.getImageResource("error.svg");
                case TestOutcome.None:
                    return Utils.getImageResource("exclamation.svg");
                case TestOutcome.NotFound:
                    return Utils.getImageResource("interrogation.svg");
                case TestOutcome.Passed:
                    return Utils.getImageResource("checked.svg");
                case TestOutcome.Skipped:
                    return Utils.getImageResource("skipped.svg");
            }
        }
        return Utils.getImageResource("interrogation.svg");
    }

    private getItemCollapsibleState(item: TestTreeType) {
        const treeItemAdditionalInfo: TestAdditionalData = this.testsAdditionalData.getValue(item.getId());
        if (treeItemAdditionalInfo) {
            return treeItemAdditionalInfo.collapsibleState;
        }
        const hasChildren: boolean = item.getChildren() ? item.getChildren().length > 0 : false;
        const collapsibleState: vscode.TreeItemCollapsibleState = hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : null;
        return collapsibleState;
    }

    private toggleItemCollapsibleState(test: TestTreeType) {
        const treeItemAdditionalInfo: TestAdditionalData = this.testsAdditionalData.getValue(test.getId());
        if (!treeItemAdditionalInfo) {
            return;
        }

        switch (treeItemAdditionalInfo.collapsibleState) {
            case vscode.TreeItemCollapsibleState.None:
                break;
            case vscode.TreeItemCollapsibleState.Collapsed:
                treeItemAdditionalInfo.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                break;
            case vscode.TreeItemCollapsibleState.Expanded:
                treeItemAdditionalInfo.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                break;
        }
    }

    private goToTestLocation(item: TestTreeType) {
        this.toggleItemCollapsibleState(item);
        this.selectedItem = item;

        if (item instanceof Test) {

            const uri: string = item.getCodeFilePath();
            vscode.workspace.openTextDocument(uri).then(result => {
                vscode.window.showTextDocument(result);
                const editor = vscode.window.activeTextEditor;

                //decrement 1 here because vscode is 0 base line index
                const range = editor.document.lineAt(item.getLineNumber() - 1).range;
                editor.selection = new vscode.Selection(range.start, range.start);
                editor.revealRange(range);
            });
        }
    }

    private showTestResult(item: TestTreeType) {
        if (item instanceof Test) {
            if (!item.getResult()) {
                return;
            }

            const result = item.getResult();

            const testOutputChannel = TestManager.getInstance().testOutputChannel;

            testOutputChannel.appendData(item.getDisplayName());
            testOutputChannel.appendData(`Duration: ${result.duration}`);
            testOutputChannel.appendData(`Start Time: ${result.startTime}`);
            testOutputChannel.appendData(`End Time: ${result.endTime}`);

            if (result.outcome == TestOutcome.Failed) {
                testOutputChannel.appendData(`Error: ${result.errorMessage}`);
                testOutputChannel.appendData(`Stack Trace: ${result.errorStackTrace}`);
            }
        }
    }
}