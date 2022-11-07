import * as chalk from 'chalk';
export const COLOR_ERROR = chalk.bold.red;
export const COLOR_INFO = chalk.white;
export const COLOR_INFO_BOLD = chalk.white.bold;
export const COLOR_WARNING = chalk.yellow;
export const COLOR_NOTIFY = chalk.cyan;
export const COLOR_TRACE = chalk.gray;
export const COLOR_HEADER = chalk.cyan.bold;
export const COLOR_SUCCESS = chalk.greenBright.bold.dim;
export const COLOR_KEY_MESSAGE = chalk.magentaBright.bold;
export const COLOR_ERROR_DIM = chalk.red.dim.italic;
export const COLOR_INFO_BOLD_DIM = chalk.white.dim.italic.bold;
export function Logger(message: string, color: chalk.Chalk = COLOR_INFO): void {
    console.log(color(message));
}
