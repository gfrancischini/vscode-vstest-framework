/**
 * Interface with the available extension configuration
 */
export interface IVSTestConfig {
    glob: string, //relative glob path to test files
    framework: string,
}


/*{
    "vstest.dotnet": {
        "testFiles": [{
            "glob":"",
            "framework":"netcoreapp1.0"
        }]
    }
}*/