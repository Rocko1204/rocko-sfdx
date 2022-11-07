import { PackageDir} from '@salesforce/core';

export type PackageDirLarge = PackageDir &
    Partial<{
        ignoreOnStage: string[];
        postDeploymentScript: string;
        preDeploymentScript: string;
        fullPath: string;
    }>;
