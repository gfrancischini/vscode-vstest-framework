# WORK IN PROGRESS 

# vscode vsTest Tools

## Sections

[List of Features](##Features)<br>
[How to Configure](##How-To-Configure)

## Quick Demo

Discover all tests, Runs specific tests, Inspect result, Debug, Go To Test Definition.

![Alt Text](resources/functionalities.gif)

## Features

### Run tests in Test Explorer

When the extension is enabled it will automatically open the Test Explorer. The discovered test will appear on the windows like on the image below

![Alt Text](resources/doc/testExplorer1.png)

As you run, write, and rerun your tests, Test Explorer displays the results in default groups of **Failed Tests**, **Passed Tests**, **Skipped Tests** and **Not Run Tests**.


### Run tests
You can run all the tests in the solution, all the tests in a group, or a set of tests that you select. Do one of the following:

* To run all the tests in a solution, click on the **...** and choose **Run All**.
* To run a specific test select the test and click on **Run**. You can also right click the test and select **Run Selected Test Case**
* To run a specific group of test select the test group and click on **Run** You can also right click the test group and select **Run Selected Test Group**

### Run tests after every build
You can enable or disable the run test after every build by adding a postBuildTask to your task.json.

## Run test progress
Every time a new test starts a progress indicator icon will be presented on the left side of test name.

![Alt Text](resources/doc/testExplorerProgress.png)


### View test results

As you run, write, and rerun your tests, Test Explorer displays the results in groups of **Failed Tests**, **Passed Tests**, **Skipped Tests** and **Not Run Tests**. The output pane at the bottom of Test Explorer displays a summary of the test run.

### View test details
To view the details of an individual test, select the test, right click and select **Show Selected Test Results**

![Alt Text](resources/doc/showSelectedTestResult.png)

The result will be displayed on the **output window**
![Alt Text](resources/doc/outputSelectedTestResult.png)

### View the source code of a test method
To display the source code for a test method in the Visual Studio Code editor you only need to left click the test. 


### Group and filter the test list
Group and filter is not supported yet.


## How To Configure

To setup your enviroment to run .NET test you must add the following configuration to the files settings.json:

```json
"vstest.dotnet": {
    "output": "bin/debug",
    "framework": "netcoreapp1.0",
    "outputFileName": "UnitTest.dll"
}
```

Configurable options:

1. "output" -> Output path where the build files are. Relative to workspace path.
2. "framework" -> The framework that the test will run/be discovered.
3. outputFileName -> Your dll/exe file name

So basically, the plugin will look for workSpaceDirectory\output\**\outputFileName. All files matching this string will be send to the VSTest

Available framework options:
* netcoreapp1.0
* netcoreapp1.1
* netcoreapp2.0
* Framework35
* Framework40
* Framework45
* net46

## Requirements

To run .Net Core Test you must install .Net Core
You must install [.Net Core](https://mochajs.org/#installation)


## Known Issues

Alpha Release

## Release Notes

0.0.2 - 2017-08-20
- Add glob/framework to settings.json
- Add group by feature (by outcome, time and class)
- Add command to initialize the extension


