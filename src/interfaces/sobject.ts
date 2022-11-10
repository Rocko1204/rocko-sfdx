export type ApexClass = {
    Id?: string;
    Name?: string;
    Body?: string;
}

export type ApexTestQueueItem = {
    Id?: string;
    ApexClass?: ApexClass;
    ApexClassId?: string;
    Status?: string;
    ExtendedStatus?: string;
    ParentJobId?: string;
    TestRunResultId?: string;
}

export type ApexCodeCoverageAggregate = {
    ApexClassOrTrigger?: ApexClassOrTrigger;
    NumLinesCovered?: number;
    NumLinesUncovered?: number;
}

export type ApexClassOrTrigger = {
    Name?: string;
}

export type ApexTestResult = {
    ApexClass?: ApexClass;
    Outcome?: string;
    MethodName?: string;
    Message?: string;
}