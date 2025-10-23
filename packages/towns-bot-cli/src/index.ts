import { green, red, yellow, cyan } from 'picocolors'
import { init, TEMPLATES, type Template } from './modules/init.js'
import { update } from './modules/update.js'
import { parseArgs, isInitArgs, isUpdateArgs } from './parser.js'

async function main() {
    const args = parseArgs(process.argv.slice(2))
    const command = args._[0]

    if (args.help || !command) {
        showHelp()
        return
    }

    try {
        switch (command) {
            case 'init':
                if (isInitArgs(args)) {
                    await init(args)
                }
                break
            case 'update':
                if (isUpdateArgs(args)) {
                    await update(args)
                }
                break
            default:
                console.error(red(`Unknown command: ${command}`))
                showHelp()
                process.exit(1)
        }
    } catch (error) {
        console.error(red('Error:'), error instanceof Error ? error.message : error)
        process.exit(1)
    }
}

function showHelp() {
    console.log(`
${cyan('towns-bot')} - CLI for creating and managing Towns Protocol bot projects

${yellow('Usage:')}
  towns-bot <command> [options]

${yellow('Commands:')}
  ${green('init')} [project-name]     Create a new bot project
  ${green('update')}                  Update @towns-protocol dependencies to latest versions
  ${green('list-commands')}           List slash commands from a file
  ${green('update-commands')}         Update slash commands for a bot

${yellow('Init Options:')}
  -t, --template <name>    Template to use:
${Object.entries(TEMPLATES)
    .map(
        ([key, template]: [string, Template]) =>
            `                             ${key} - ${template.description}`,
    )
    .join('\n')}
                           Default: quickstart

${yellow('List Commands Options:')}
  -f, --file <path>        Path to commands file

${yellow('Update Commands Options:')}
  -f, --file <path>         Path to commands file
  -t, --bearerToken <token>  Bearer token for authentication
  -e, --envFile <path>       Path to .env file (default: .env)

${yellow('Global Options:')}
  -h, --help               Show this help message

${yellow('Examples:')}
  ${cyan('# Create a new bot project')}
  towns-bot init my-bot
  towns-bot init my-ai-bot --template quickstart

  ${cyan('# Update dependencies')}
  towns-bot update

  ${cyan('# List slash commands')}
  towns-bot list-commands src/commands.ts
  towns-bot list-commands --file src/commands.ts

  ${cyan('# Update slash commands (positional arguments)')}
  towns-bot update-commands commands.ts token123

  ${cyan('# Update slash commands (named arguments)')}
  towns-bot update-commands --file commands.ts --bearerToken token123
  towns-bot update-commands -f commands.ts -t token123 -e custom.env

  ${cyan('Note: Bot address and environment are read from APP_PRIVATE_DATA in .env')}
`)
}

main().catch((error) => {
    console.error(red('Unexpected error:'), error)
    process.exit(1)
})
