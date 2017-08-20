import * as vscode from "vscode";
import { RegisterVSTestTreeProvider } from "./vsCode/testTreeDataProvider/testTreeDataProvider";
import { TestManager } from "./vsCode/vsTest/vsTestManager";
import { RegisterTestExecutionCommands } from "./vsCode/commands/testExecutionCommands";
import { RegisterTestDiscoveryCommands } from "./vsCode/commands/testDiscoveryCommands";
import { isExtensionEnabled } from "./vsCode/config";

export function activate(context: vscode.ExtensionContext): void {
    if (isExtensionEnabled()) {
        RegisterTestExecutionCommands(context);
        RegisterTestDiscoveryCommands(context);
        RegisterVSTestTreeProvider(context);
    }
}


/**
 * This method is called when your extension is deactivated
 */
export function deactivate(): void {
}