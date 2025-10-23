import minimist from 'minimist'

// Command-specific argument interfaces
export interface BaseArgs {
    _: string[]
    help?: boolean
}

export interface InitArgs extends BaseArgs {
    template?: string
}

export type UpdateArgs = BaseArgs

export type CommandArgs = InitArgs | UpdateArgs

// Command configurations for minimist
const COMMAND_CONFIGS: Record<string, minimist.Opts> = {
    init: {
        string: ['template'],
        alias: { t: 'template' },
        default: { template: 'quickstart' },
    },
    update: {
        // No special config needed
    },
    'list-commands': {
        string: ['file'],
        alias: { f: 'file' },
    },
    'update-commands': {
        // Force all positional args after command to be strings (prevents hex->number conversion)
        string: ['file', 'bearerToken', 'envFile', '_'],
        alias: {
            f: 'file',
            t: 'bearerToken',
            e: 'envFile',
        },
        default: { envFile: '.env' },
    },
}

/**
 * Parse command line arguments with command-specific configurations
 *
 * This function does a two-pass parse:
 * 1. First parse to identify the command
 * 2. Second parse with command-specific configuration
 *
 * This allows each command to have its own argument parsing rules,
 * preventing issues like hex addresses being converted to numbers.
 */
export function parseArgs(args: string[]): CommandArgs {
    // First, do a minimal parse to get the command
    const initial = minimist(args, {
        stopEarly: true,
        boolean: ['help'],
        alias: { h: 'help' },
    })

    const command = initial._[0]

    // If no command or help requested, return early
    if (!command || initial.help) {
        return initial as BaseArgs
    }

    // Get command-specific configuration
    const commandConfig = COMMAND_CONFIGS[command] || {}

    // Re-parse with command-specific configuration
    const booleanOptions = Array.isArray(commandConfig.boolean)
        ? ['help', ...commandConfig.boolean]
        : ['help']
    const parsed = minimist(args, {
        ...commandConfig,
        boolean: booleanOptions,
        alias: {
            ...commandConfig.alias,
            h: 'help',
        },
    })

    return parsed as CommandArgs
}

/**
 * Type guard functions for command-specific args
 */
export function isInitArgs(args: CommandArgs): args is InitArgs {
    return args._[0] === 'init'
}

export function isUpdateArgs(args: CommandArgs): args is UpdateArgs {
    return args._[0] === 'update'
}
