import { VSTestService, VSTestServiceStatus } from "./vsTest/vsTestService";

/*const glob = {
    output: "", 
    framework: "",
    outputFileName : "NodejsConsoleApp1.njsproj"
}*/

const glob = {
    output: "**/bin/debug",
    outputFileName: "vscodecsharp.dll",
    framework: "netcoreapp1.0"
};
var test = new VSTestService("", "dotnet", glob);

//var test = new VSTestService("C:\\Users\\gfrancischini\\source\\repos\\NodejsConsoleApp1\\NodejsConsoleApp1", "dotnet",  glob);
//var test = new VSTestService({glob : "*.cs"});
//var test = new VSTestService({glob : "**/bin/debug/**/vscodecsharp.dll"});
test.startTestRunner().then(() => {
    //test.discoverTests();
    let path = "C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\test\\testhost.UnitTests\\bin\\Debug";
    path = "C:\\Users\\gfrancischini\\source\\repos\\vscodecsharp";
    //path = "C:\\Users\\gfrancischini\\source\\repos\\NodejsConsoleApp1\\NodejsConsoleApp1"
    test.discoveryTests(path).then((value) => {
        test.runTests(test.getModel().getTests());
    });
});

//test.onDidTestServiceStatusChanged((serviceStatus : VSTestServiceStatus) => {
//});

test.getModel().onDidTestChanged((test) => {
    console.log(test.displayName);
})

