import minimist from 'minimist'

// Command-specific argument interfaces
export interface BaseArgs {
    _: string[]
    help?: boolean
}

export interface InitArgs extends BaseArgs {
    template?: string
}

export interface UpdateArgs extends BaseArgs {
    skipAgentsMd?: boolean
}

export type SkillArgs = BaseArgs

export type CommandArgs = InitArgs | UpdateArgs

// Command configurations for minimist
const COMMAND_CONFIGS: Record<string, minimist.Opts> = {
    init: {
        string: ['template'],
        alias: { t: 'template' },
        default: { template: 'quickstart' },
    },
    update: {
        boolean: ['skipAgentsMd'],
        alias: { 'skip-agents-md': 'skipAgentsMd' },
    },
    'install-skill': {},
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

export function isSkillArgs(args: CommandArgs): args is SkillArgs {
    return args._[0] === 'install-skill'
}
