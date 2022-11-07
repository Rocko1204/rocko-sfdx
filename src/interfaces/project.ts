export type ProjectCheckOutput= {
    Process: string;
    Package: string;
    Message: string;
}

export enum ProjectCheckProcess {
    TREE_VERSION_UPDATE = 'Package tree version',
    MISSING_DEPS = 'Package tree missing dependencies',
    TREE_ORDER = 'Package tree order',
    TREE_DEPS_ORDER = 'Package tree dependencies order',
    TREE_DEPS_VERSION = 'Package tree dependencies version'
}