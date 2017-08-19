import { VSTestService, VSTestServiceStatus } from "./vsTest/vsTestService";


var test = new VSTestService("dotnet", {glob : "**/bin/debug/netcoreapp1.0/vscodecsharp.dll", framework: "netcoreapp1.0"});
//var test = new VSTestService({glob : "*.cs"});
//var test = new VSTestService({glob : "**/bin/debug/**/vscodecsharp.dll"});
test.startTestRunner().then(() => {
    //test.discoverTests();
    let path = "C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\test\\testhost.UnitTests\\bin\\Debug";
    path = "C:\\Users\\gfrancischini\\source\\repos\\vscodecsharp";
    test.discoveryTests(path).then((value) => {
        test.runTests(test.getModel().getTests());
    });
});

//test.onDidTestServiceStatusChanged((serviceStatus : VSTestServiceStatus) => {
//});

test.getModel().onDidTestChanged((test) => {
    console.log(test.displayName);
})

