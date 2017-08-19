import * as vscode from "vscode";
import {IVSTestConfig} from "../vsTest/vsTestConfig";

export function getCurrentAdapterName() {
    //return vscode.workspace.getConfiguration("vstest.adapterName");
    return "dotnet";
}

export function getConfigurationForAdatper() : IVSTestConfig {
    return  vscode.workspace.getConfiguration(`vstest.${getCurrentAdapterName()}`) as any;
}

