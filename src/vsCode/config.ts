import * as vscode from "vscode";
import {IVSTestConfig} from "../vsTest/vsTestConfig";

export let config: IVSTestConfig =  vscode.workspace.getConfiguration("vstest.dotnet") as any;
