import { VSTestService, VSTestServiceStatus } from "./vsTest/vsTestService";


//var test = new VSTestService({glob : "**/*Tests.dll"});
//var test = new VSTestService({glob : "*.cs"});
var test = new VSTestService({glob : "**/vscodecsharp.dll"});
test.startTestRunner().then(() => {
    //test.discoverTests();
    let path = "C:\\Users\\gfrancischini\\Desktop\\vstest-rel-15.3-rtm\\test\\testhost.UnitTests\\bin\\Debug";
    path = "C:\\Users\\gfrancischini\\source\\repos\\vscodecsharp";
    test.discoverTests(path).then(() => {
        test.runTests(test.getModel().getTests());
    });
});

//test.onDidTestServiceStatusChanged((serviceStatus : VSTestServiceStatus) => {
//});

test.getModel().onDidTestChanged((test) => {
    console.log(test.displayName);
})

