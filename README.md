@rocko1204/rocko-sfdx
=====================

sfdx cli to build awesome package tool

[![Version](https://img.shields.io/npm/v/@rocko1204/rocko-sfdx.svg)](https://npmjs.org/package/@rocko1204/rocko-sfdx)
[![CircleCI](https://circleci.com/gh/github/rocko-sfdx/tree/master.svg?style=shield)](https://circleci.com/gh/github/rocko-sfdx/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/github/rocko-sfdx?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/rocko-sfdx/branch/master)
[![Greenkeeper](https://badges.greenkeeper.io/github/rocko-sfdx.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/github/rocko-sfdx/badge.svg)](https://snyk.io/test/github/github/rocko-sfdx)
[![Downloads/week](https://img.shields.io/npm/dw/@rocko1204/rocko-sfdx.svg)](https://npmjs.org/package/@rocko1204/rocko-sfdx)
[![License](https://img.shields.io/npm/l/@rocko1204/rocko-sfdx.svg)](https://github.com/github/rocko-sfdx/blob/master/package.json)

<!-- toc -->
* [Debugging your plugin](#debugging-your-plugin)
<!-- tocstop -->
<!-- install -->
<!-- usage -->
```sh-session
$ sfdx plugins:install @rocko1204/rocko-sfdx
...
```
<!-- usagestop -->
<!-- commands -->
* [`sfdx rocko:project:validate [-s <string>] [-v -t <string>] [-m] [-o] [-d] [-i <string>] [-e <string>] [-f] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#rocko1204rocko-sfdx-rockoprojectvalidate--s-string--v--t-string--m--o--d--i-string--e-string--f--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx rocko:project:validate [-s <string>] [-v -t <string>] [-m] [-o] [-d] [-i <string>] [-e <string>] [-f] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

This command performs static checks in the sfdx-project json file for changed packages. Optional flags are used to control which validations are to be carried out. The individual tests are described with the flags.

```
USAGE
  $ sfdx rocko:project:validate [-s <string>] [-v -t <string>] [-m] [-o] [-d] [-i <string>] [-e 
  <string>] [-f] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --depsversion
      Checks whether the dependent packages have at least the versions of the dependent packages. Default this commands
      checks only the required versions. This check includes only unlocked packages.

  -e, --exclude=exclude
      Packages to exclude from validation. Multiple selection possible via comma separated list.

  -f, --fix
      This flag is used to directly update the sfdx-project.json file with the fixes. The default value is false

  -i, --include=include
      Packages to validate via command line input. Multiple selection possible via comma separated list.

  -m, --missingdeps
      Checks whether all dependend packages are present in the package tree. This checks includes only unlocked packages.

  -o, --order
      Checks if the dependent packages are arranged in the correct order in the package tree. Furthermore, it is checked
      that the dependend packages are arranged in front of the unlocked package in the tree. This check includes only
      unlocked packages.

  -s, --source=source
      This flag is required for the git diff check and describes the source value. The default value is HEAD

  -t, --target=target
      This flag is required for the git diff check and describes the target value. The default value is remote main
      branch.

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  -v, --versionupdate
      Checks whether the versions of the changed packages for the merge request have been updated. The check is against
      the target branch. So the target flag is required.

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

EXAMPLES
  sfdx rocko:project:validate -t origin/main --versionupdate
  sfdx rocko:project:validate --order --include core
  sfdx rocko:project:validate -t origin/main --versionupdate --missingdeps --order --depsversion
  sfdx rocko:project:validate -t origin/main - -v -m -o -d
  sfdx rocko:project:validate -t origin/main - -v -m -o -d -f
  sfdx rocko:project:validate -t origin/main --versionupdate --missingdeps --order --depsversion --fix
```

_See code: [src/commands/rocko/project/validate.ts](https://github.com/github/rocko-sfdx/blob/v0.0.1/src/commands/rocko/project/validate.ts)_
<!-- commandsstop -->
<!-- debugging-your-plugin -->
# Debugging your plugin
We recommend using the Visual Studio Code (VS Code) IDE for your plugin development. Included in the `.vscode` directory of this plugin is a `launch.json` config file, which allows you to attach a debugger to the node process when running your commands.

To debug the `rocko:project:validate` command: 
1. Start the inspector
  
If you linked your plugin to the sfdx cli, call your command with the `dev-suspend` switch: 
```sh-session
$ sfdx rocko:project:validate -u myOrg@example.com --dev-suspend
```
  
Alternatively, to call your command using the `bin/run` script, set the `NODE_OPTIONS` environment variable to `--inspect-brk` when starting the debugger:
```sh-session
$ NODE_OPTIONS=--inspect-brk bin/run rocko:project:validate -u myOrg@example.com
```

2. Set some breakpoints in your command code
3. Click on the Debug icon in the Activity Bar on the side of VS Code to open up the Debug view.
4. In the upper left hand corner of VS Code, verify that the "Attach to Remote" launch configuration has been chosen.
5. Hit the green play button to the left of the "Attach to Remote" launch configuration window. The debugger should now be suspended on the first line of the program. 
6. Hit the green play button at the top middle of VS Code (this play button will be to the right of the play button that you clicked in step #5).
<br><img src=".images/vscodeScreenshot.png" width="480" height="278"><br>
Congrats, you are debugging!
