/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import {flags, SfdxCommand} from '@salesforce/command';
import {Messages, SfError } from '@salesforce/core';
import {AnyJson} from '@salesforce/ts-types';
import { ComponentSet, MetadataApiDeploy, MetadataResolver,DeployDetails } from '@salesforce/source-deploy-retrieve';
import * as Table from 'cli-table3';
import * as path from 'path';
import {LOGOBANNER} from '../../../utils';
const util = require('util');
const exec = util.promisify(require('child_process').exec);
import {
    Logger,
    COLOR_KEY_MESSAGE,
    COLOR_HEADER,
    COLOR_TRACE,
    COLOR_WARNING,
    COLOR_NOTIFY,
    COLOR_INFO,
    COLOR_SUCCESS,
    COLOR_ERROR
} from '../../../utils';
import { QueryResult } from 'jsforce';
import {PackageDirLarge, UnlockedPackageInfo, PackageDirLargeWithDep, CodeCoverageWarnings, DeployError, ApexTestQueueResult, ApexTestclassCheck} from "../../../interfaces/package";
import {ApexClass, ApexTestQueueItem, ApexCodeCoverageAggregate, ApexTestResult} from "../../../interfaces/sobject";


// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@rocko1204/rocko-sfdx', 'package_validate');

export default class PackageCheck extends SfdxCommand {
    public static description = messages.getMessage('commandDescription');

    public static examples = messages.getMessage('examples').split(os.EOL);

    public static args = [{name: 'file'}];

    protected static flagsConfig = {
        // Label For Named Credential as Required
        deploymentscripts: flags.boolean({
            char: 'd',
            description: messages.getMessage('deploymentscripts'),
            default: false,
            required: false,
        }),
        onlytests: flags.boolean({
            char: 'o',
            description: messages.getMessage('onlytests'),
            required: false,
        }),
        package: flags.string({
            char: 'p',
            description: messages.getMessage('package'),
            default: '',
            required: true,
        }),
    };

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = true;
    // Comment this out if your command does not require an org username
    protected static requiresUsername = true;

    /**
     * @description - This method is used to run the sfdx command
     *
     */
    public async run(): Promise<AnyJson> {
        Logger(LOGOBANNER, COLOR_HEADER);
        Logger(`Start package validation...`, COLOR_KEY_MESSAGE);
        const packageDirs: PackageDirLargeWithDep[] = this.project.getSfProjectJson().getContents().packageDirectories;
        const packageAliases = this.project.getSfProjectJson().getContents().packageAliases;
        const packageTreeMap = await this.getPackageTree(packageDirs);
        let packageTable = new Table({
            head: [COLOR_NOTIFY('Package')],
        });
        Logger(packageTable.toString(),COLOR_INFO);
        Logger(`Is this a source or unlocked package? 🤔`, COLOR_TRACE);
        for (const [key, value] of packageTreeMap) {
            if (!packageAliases[value.package]) {
                Logger(`Oh nice 👏. It's a unlocked package. Start validation`, COLOR_INFO);
                Logger(`👆. Important. This package needs a code coverage 75 %`, COLOR_INFO);
                Logger(`👆. Important. Please use a empty org to validate`, COLOR_INFO);
                Logger(`👆. Important. Apex tests run only for the selected package. Not for the dependent packages`, COLOR_INFO);
                //Deploy Unlocked Package
                if (!this.flags.onlytests) {
                    await this.deployUnlockedPackageWithDependency(key, value)
                } else {
                    Logger(`👆 No deployment, only testclass execution`, COLOR_WARNING);
                }
                //Run Tests
                await this.getUnlockedApexClassesFromPaths(key, value.path);
            } else {
                 Logger(`OMG only a source package 😒. Start validation`, COLOR_INFO);
                 Logger(`👆. Important. Any apex class needs a code coverage 75 %`, COLOR_INFO);
                 Logger(`👆. Important. Please use a sandbox org to validate`, COLOR_INFO);
                 Logger(`⚠️⚠️⚠️👆. This check is in progress. Please wait for the next version update ⚠️⚠️⚠️`, COLOR_WARNING);
            }
        }
        Logger(`Yippiee. 🤙 Validation finsihed without errors. Great 🤜🤛`,COLOR_HEADER);
        return {}
    }

    private async getPackageTree(packageDirList: PackageDirLargeWithDep[]): Promise<Map<string, PackageDirLarge>> {
           const packageTree = new Map<string, PackageDirLargeWithDep>();
            for (const packageDir of packageDirList) {
                if(this.flags.package === packageDir.package){
                    packageTree.set(packageDir.path, packageDir);
                }
            }
            if(packageTree.size === 0){ throw new SfError(`Package ${this.flags.package} not found in sfdx-project.json`)}

            return packageTree;
    }
    private async deployUnlockedPackageWithDependency(pck: string, pckTree: PackageDirLargeWithDep): Promise<void> {
        let pckList: string[] = [];
        let depList: string[] = [];
        const packageDeployMap = new Map<string, string>();
        Logger(`💪 Start deploy process`,COLOR_HEADER);

        const packageSingleMap = new Map<string, UnlockedPackageInfo>();
        // get package
        pckTree.dependency.forEach((dep) => {
            if (dep.path && !packageDeployMap.get(dep.package)) {
                packageDeployMap.set(dep.package, `Dependency`);
                packageSingleMap.set(dep.package, {
                    message: `Dependency`,
                    path: dep.path,
                    postDeploymentScript: dep.postDeploymentScript,
                    preDeploymentScript: dep.preDeploymentScript,
                });
            }
        });
        if (!packageDeployMap.get(pck)) {
            packageDeployMap.set(pck, `Package`);
            packageSingleMap.set(pck, {
                message: `Package`,
                postDeploymentScript: pckTree.postDeploymentScript,
                preDeploymentScript: pckTree.preDeploymentScript,
            });
        }
        if (packageSingleMap.size > 0) {
            for (const [key, value] of packageSingleMap) {
                if (value.message === 'Package') {
                    pckList.push(key);
                } else {
                    depList.push(key);
                }
            }
            if (pckList.length > 0) {
                Logger(`${COLOR_NOTIFY('Package:')} ${COLOR_INFO(pckList.join())}`);
            }
            if (pckList.length > 0) {
                Logger(`${COLOR_NOTIFY('Dependencies:')} ${COLOR_INFO(depList.join())}`);
            }
            for (const [key, value] of packageSingleMap) {
                Logger(COLOR_INFO(`👉 Start deployment for package ${key}`));
                //execute pre deployment script for dependency
                if (value.preDeploymentScript && this.flags.deploymentscripts) {
                    Logger(COLOR_INFO(`☝ Found pre deployment script for dependency package ${key}`));
                    await this.runDeploymentSteps(value.preDeploymentScript, 'preDeployment', key);
                }
                await this.deployPackageTreeNode(key, value.path);
                //execute post deployment script for dependency
                if (value.postDeploymentScript && value.message === 'Package' && this.flags.deploymentscripts) {
                    Logger(COLOR_INFO(`☝ Found post deployment script for dependency package ${key}`));
                    await this.runDeploymentSteps(value.postDeploymentScript, 'postDeployment', key);
                }
            }

            //await tasks.run();
            // deploy dependencies
        } else {
            throw new SfError(
                `Found no package tree information for package: ${pck} and path ${path}. Please check the order for this package and his dependecies in the sfdx-project.json. 
First the dependecies packages. And then this package.`
            );
            }}
    private async runDeploymentSteps(scriptPath: string, scriptStep: string, scriptVariable1: string) {
        Logger(`Execute deployment script`,COLOR_HEADER);
        Logger(`${COLOR_NOTIFY('Path:')} ${COLOR_INFO(scriptPath)}`);
        try {
            const cmdPrefix = process.platform !== 'win32' ? 'sh -e' : 'cmd.exe /c';
            const { stdout, stderr } = await exec(
                `${cmdPrefix} ${path.normalize(scriptPath)} ${scriptVariable1} ${this.org.getConnection().getUsername()}`,
                { timeout: 0, encoding: 'utf-8', maxBuffer: 5242880 }
            );
            if (stderr) {
                Logger(`${scriptStep} Command Error: ${stderr}`,COLOR_ERROR);
            }
            if (stdout) {
                Logger(COLOR_INFO(`${scriptStep} Command Info: ${stdout}`));
            }
        } catch (e) {
            Logger(COLOR_ERROR(`${scriptStep} Command Error: ${e}`));
        }
    }
    private async deployPackageTreeNode(pck: string, path: string): Promise<void> {
        const deploy: MetadataApiDeploy = await ComponentSet.fromSource(path).deploy({
            usernameOrConnection: this.org.getConnection().getUsername(),
        });
        // Attach a listener to check the deployment status on each poll
        let counter = 0;
        deploy.onUpdate((response) => {
            if (counter === 5) {
                const { status, numberComponentsDeployed, numberComponentsTotal } = response;
                const progress = `${numberComponentsDeployed}/${numberComponentsTotal}`;
                const message = `⌛ Deploy Package: ${pck} Status: ${status} Progress: ${progress}`;
                Logger(message,COLOR_TRACE);
                counter = 0;
            } else {
                counter++;
            }
        });

        // Wait for polling to finish and get the DeployResult object
        const res = await deploy.pollStatus();
        if (!res.response.success) {
            await this.createOutput(res.response.details);
        } else {
            Logger(`✔ Deployment for Package ${pck} successfully 👌`,COLOR_SUCCESS);
        }
    }

    private async createOutput(input: DeployDetails): Promise<void> {
        let table = new Table({
            head: ['Component Name', 'Error Message'],
            colWidths: [60, 60], // Requires fixed column widths
            wordWrap: true,
        });
        //print deployment errors
        if (
            (Array.isArray(input.componentFailures) && input.componentFailures.length > 0) ||
            (typeof input.componentFailures === 'object' && Object.keys(input.componentFailures).length > 0)
        ) {
            let result: DeployError[] = [];
            if (Array.isArray(input.componentFailures)) {
                result = input.componentFailures.map((a) => {
                    const res: DeployError = {
                        Name: a.fullName,
                        Type: a.componentType,
                        Status: a.problemType,
                        Message: a.problem,
                    };
                    return res;
                });
            } else {
                const res: DeployError = {
                    Name: input.componentFailures.fullName,
                    Type: input.componentFailures.componentType,
                    Status: input.componentFailures.problemType,
                    Message: input.componentFailures.problem,
                };
                result = [...result, res];
            }
            result.forEach((r) => {
                let obj = {};
                obj[r.Name] = r.Message;
                table.push(obj);
            });
            console.log(table.toString());
            throw new SfError(
                `Deployment failed. Please check error messages from table and fix this issues from package.`
            );
            // print test run errors
        } else if (
            (input.runTestResult &&
                input.runTestResult.failures &&
                Array.isArray(input.runTestResult.failures) &&
                input.runTestResult.failures.length > 0) ||
            (input.runTestResult &&
                typeof input.runTestResult.failures === 'object' &&
                Object.keys(input.runTestResult.failures).length > 0)
        ) {
            let tableTest = new Table({
                head: ['Apex Class', 'Message', 'Stack Trace'],
                colWidths: [60, 60, 60], // Requires fixed column widths
                wordWrap: true,
            });
            if (Array.isArray(input.runTestResult.failures)) {
                input.runTestResult.failures.forEach((a) => {
                    tableTest.push([a.name, a.message, a.stackTrace]);
                });
            } else {
                tableTest.push([
                    input.runTestResult.failures.name,
                    input.runTestResult.failures.message,
                    input.runTestResult.failures.stackTrace,
                ]);
            }
            console.log(tableTest.toString());
            throw new SfError(
                `Testrun failed. Please check the testclass errors from table and fix this issues from package.`
            );
            // print code coverage errors
        } else if (
            (input.runTestResult &&
                input.runTestResult.codeCoverageWarnings &&
                Array.isArray(input.runTestResult.codeCoverageWarnings) &&
                input.runTestResult.codeCoverageWarnings.length > 0) ||
            (input.runTestResult &&
                typeof input.runTestResult.codeCoverageWarnings === 'object' &&
                Object.keys(input.runTestResult.codeCoverageWarnings).length > 0)
        ) {
            if (Array.isArray(input.runTestResult.codeCoverageWarnings)) {
                const coverageList: CodeCoverageWarnings[] = input.runTestResult.codeCoverageWarnings;
                coverageList.forEach((a) => {
                    table.push([a.name, a.message]);
                });
            } else {
                const coverageList: CodeCoverageWarnings = input.runTestResult.codeCoverageWarnings
                table.push([coverageList.name, coverageList.message]);
            }
            console.log(table.toString());
            throw new SfError(
                `Testcoverage failed. Please check the coverage from table and fix this issues from package.`
            );
        } else {
            throw new SfError(
                `Validation failed. No errors in the response. Please validate manual and check the errors on org (setup -> deployment status).`
            );
        }
    }
    private async getUnlockedApexClassesFromPaths(pck: string, path: string): Promise<void> {
        Logger(`💪 Start Apex tests for package ${pck}.`,COLOR_HEADER);
        const apexTestClassIdList: string[] = [];
        const apexClassIdList: string[] = [];
        const apexTestClassNameList: string[] = [];
        const resolver: MetadataResolver = new MetadataResolver();
        let queueIdList: string[] = [];
        let testRunResult: ApexTestQueueResult;
        let apexCounter: number = 0;

        for (const component of resolver.getComponentsFromPath(path)) {
            if (component.type.id === 'apexclass') {
                apexCounter++;
                const apexCheckResult: ApexTestclassCheck = await this.checkIsTestClass(component.name);
                if (apexCheckResult.isTest) {
                    apexTestClassIdList.push(apexCheckResult.Id);
                    apexTestClassNameList.push(component.name);
                } else {
                    apexClassIdList.push(apexCheckResult.Id);
                }
            }
        }

        if (apexCounter > 0 && apexTestClassNameList.length === 0) {
            throw new SfError(
                `Found apex class(es) for package ${pck} but no testclass(es). Please create a new testclass.`
            );
        }
        Logger(`${COLOR_NOTIFY('Package:')} ${COLOR_INFO(pck)}`);
        Logger(
            `${COLOR_NOTIFY('Testclasses:')} ${COLOR_INFO(
                `${apexTestClassNameList.length > 0 ? apexTestClassNameList.join() : 'No Testclasses found.'}`
            )}`
        );
        //insert Apex classes to test queue
        if (apexTestClassIdList.length > 0) {
            queueIdList = await this.addUnlockedClassesToApexQueue(apexTestClassIdList);
        }

        //check test queue and wait for finish
        Logger(`⌛ Waiting For test run results`,COLOR_INFO);
        let _i: number = 2;

        do {
            testRunResult = await this.checkUnlockedTestRunStatus(queueIdList);
            Logger(
                COLOR_TRACE(
                    `Test Processing: ${testRunResult.ProcessingList.length}, Test Completed: ${testRunResult.CompletedList.length},Test Failed: ${testRunResult.FailedList.length} , Test Queued: ${testRunResult.QueuedList.length}`
                )
            );
            await new Promise((resolve) => setTimeout(resolve, 10000));
            _i++;
            if (_i > 180) {
                throw new Error('Apex test run timeout after 30 minutes');
            }
        } while (testRunResult.QueuedList.length > 0 || testRunResult.ProcessingList.length > 0);

        //check testrun result only for errors
        await this.checkUnlockedTestResult(apexTestClassIdList, queueIdList);

        //check Code Coverage
        if (apexClassIdList.length > 0) {
            await this.checkUnlockedCodeCoverage(apexClassIdList);
        }
    }
    //check if apex class is a testclass from code identifier @isTest
    private async checkIsTestClass(comp: string): Promise<ApexTestclassCheck> {
        let result: ApexTestclassCheck = { Id: '', isTest: false };
        try {
            const apexObj: ApexClass = await this.org.getConnection().singleRecordQuery(
                `Select Id,Name,Body from ApexClass Where Name = '" + ${comp} + "' And ManageableState = 'unmanaged' LIMIT 1`,
                { tooling: true }
            );
            if (apexObj && (apexObj.Body.search('@isTest') > -1 || apexObj.Body.search('@IsTest') > -1)) {
                result.isTest = true;
            }
            result.Id = apexObj.Id;
        } catch (e) {
            throw new SfError(`Apex Query Error for Comp: ${comp} with detail error: ${e}`);
        }

        return result;
    }
    private async addUnlockedClassesToApexQueue(apexTestClassIdList: string[]): Promise<string[]> {
        let recordResult: string[] = [];
        try {
            const queueResponse = await this.org.getConnection().requestPost(`${this.org.getConnection()._baseUrl()}/tooling/runTestsAsynchronous/`, {
                classids: apexTestClassIdList.join(),
            });
            const jobId: string = queueResponse ? Object.values(queueResponse).join('') : '';
            if (jobId) {
                recordResult.push(jobId);
            } else {
                throw new SfError(`Post Request to Queue runs on error`);
            }
        } catch (e) {
            throw new SfError(`Insert to queue runs on error`);
        }
        return recordResult;
    }
    private async checkUnlockedTestRunStatus(ids: string[]): Promise<ApexTestQueueResult> {
        let queueResult: ApexTestQueueResult = {
            QueuedList: [],
            CompletedList: [],
            FailedList: [],
            ProcessingList: [],
            OtherList: [],
        };
        try {
            const responseFromOrg = await this.org.getConnection().tooling.query<ApexTestQueueItem>(
                `Select Id, ApexClassId,ApexClass.Name, Status, ExtendedStatus, ParentJobId, TestRunResultId from ApexTestQueueItem Where ParentJobId In ('${ids.join(
                    "','"
                )}')`
            );
            if (responseFromOrg.records) {
                for (const result of responseFromOrg.records) {
                    if (result.Status === 'Queued') {
                        queueResult.QueuedList.push(result?.ApexClass?.Name);
                    } else if (result.Status === 'Completed') {
                        queueResult.CompletedList.push(result?.ApexClass?.Name);
                    } else if (result.Status === 'Failed') {
                        queueResult.FailedList.push(result?.ApexClass?.Name);
                    } else if (result.Status === 'Processing') {
                        queueResult.ProcessingList.push(result?.ApexClass?.Name);
                    } else {
                        queueResult.OtherList.push(result?.ApexClass?.Name);
                    }
                }
            }
        } catch (e) {
            console.log(e);
            throw new SfError(messages.getMessage('errorApexQueueSelect'));
        }
        return queueResult;
    }
    private async checkUnlockedCodeCoverage(ids: string[]): Promise<void> {
        let table = new Table({
            head: [
                COLOR_INFO('Apex Test Modul'),
                COLOR_INFO('NumLinesCovered'),
                COLOR_INFO('NumLinesUncovered'),
                COLOR_INFO('Coverage in Percent'),
            ],
        });
        let coveredCounter: number = 0;
        let uncoveredCounter: number = 0;
        let packageCoverage: number = 0;
        try {
            const responseFromOrg = await this.org.getConnection().tooling.query<ApexCodeCoverageAggregate>(
                `Select ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered from ApexCodeCoverageAggregate Where ApexClassOrTriggerId In ('${ids.join(
                    "','"
                )}')`
            );
            if (responseFromOrg.records) {
                for (const result of responseFromOrg.records) {
                    table.push([
                        result.ApexClassOrTrigger.Name,
                        result.NumLinesCovered,
                        result.NumLinesUncovered,
                        result.NumLinesCovered > 0
                            ? Math.floor((result.NumLinesCovered / (result.NumLinesCovered + result.NumLinesUncovered)) * 100)
                            : 0,
                    ]);
                    coveredCounter += result.NumLinesCovered;
                    uncoveredCounter += result.NumLinesUncovered;
                }
            }
        } catch (e) {
            throw new SfError(`System Exception: Problems to fetch results from ApexCodeCoverageAggregate`);
        }

        if (coveredCounter === 0) {
            throw new SfError(`This package has no covered lines. Please check the testclasses.`);
        }
        packageCoverage = Math.floor((coveredCounter / (coveredCounter + uncoveredCounter)) * 100);
        Logger('Check Code Coverage for Testclasses:',COLOR_INFO);
        Logger(table.toString(),COLOR_INFO);
        if (packageCoverage < 75) {
            throw new SfError(
                `The package has an overall coverage of ${packageCoverage}%, which does not meet the required overall coverage of 75%. Please check the testclass coverage table and fix the test classes.`
            );
        } else {
            Logger(`👏 Great. This package has a code coverage from ${packageCoverage}%. 😊`,COLOR_SUCCESS);
        }
    }
    private async checkUnlockedTestResult(apexClassList: string[], jobId: string[]): Promise<void> {
        let responseFromOrg: QueryResult<ApexTestResult>;
        try {
            responseFromOrg = await this.org.getConnection().query<ApexTestResult>(
                `Select ApexClass.Name, Outcome, MethodName, Message from ApexTestResult Where Outcome = 'Fail' And ApexClassId In ('${apexClassList.join(
                    "','"
                )}') And AsyncApexJobId In ('${jobId.join("','")}')`
            );
        } catch (e) {
            throw new SfError(`System Exception: Problems to found Results from ApexTestResult`);
        }
        let table = new Table({
            head: [COLOR_ERROR('ApexClass Name'), COLOR_ERROR('Methodname'), COLOR_ERROR('ErrorMessage')],
            colWidths: [60, 60, 60],
            wordWrap: true,
        });
        if (responseFromOrg.records.length > 0) {
            for (const result of responseFromOrg.records) {
                table.push([result.ApexClass.Name, result.MethodName, result.Message]);
            }
            console.log(table.toString());
            Logger(`This package contains testclass errors.`,COLOR_ERROR);
            throw new SfError(`Please fix this issues from the table and try again.`);
        }
    }
    }
