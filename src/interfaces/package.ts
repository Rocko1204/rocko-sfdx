import { PackageDir} from '@salesforce/core';

export type PackageDirLarge = PackageDir &
    Partial<{
        ignoreOnStage: string[];
        postDeploymentScript: string;
        preDeploymentScript: string;
        fullPath: string;
    }>;

export type UnlockedPackageInfo = {
    message?: string;
    path?: string;
    postDeploymentScript?: string;
    preDeploymentScript?: string;
}

export type PackageDirLargeWithDep = PackageDirLarge &
    Partial<{
        dependency: PackageDirLarge[];
    }>;

export type CodeCoverageWarnings = {
    id: string;
    message: string;
    name?: string;
}

export type DeployError = {
    LineNumber?: string;
    Name?: string;
    Type?: string;
    Status?: string;
    Message?: string;
}

export type ApexTestQueueResult = {
    QueuedList: string[];
    CompletedList: string[];
    FailedList: string[];
    ProcessingList: string[];
    OtherList: string[];
}

export type ApexTestclassCheck = {
    Id?: string;
    isTest?: boolean;
}

export type SourcePackageComps = {
    comps?: string[];
    apexClassNames?: string[];
    apexTestclassNames?: string[];
}

