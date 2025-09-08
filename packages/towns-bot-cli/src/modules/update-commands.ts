import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import * as dotenv from 'dotenv'
import { ethers } from 'ethers'
import { green, red, yellow, cyan } from 'picocolors'
import {
    makeSignerContextFromBearerToken,
    AppRegistryService,
    getAppRegistryUrl,
    parseAppPrivateData,
} from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { SlashCommandSchema, type PlainMessage, type SlashCommand } from '@towns-protocol/proto'
import type { UpdateCommandsArgs } from '../parser.js'
import { create } from '@bufbuild/protobuf'

export async function updateCommands(argv: UpdateCommandsArgs) {
    const filePath = argv.file || argv._[1]
    const bearerToken = argv.bearerToken || argv._[2]
    const envFile = argv.envFile || '.env'

    if (!filePath || !bearerToken) {
        console.error(red('Error: Missing required arguments'))
        console.log()
        console.log(yellow('Usage:'))
        console.log('  towns-bot update-commands <file-path> <bearer-token>')
        console.log(cyan('  OR'))
        console.log(
            '  towns-bot update-commands --file <path> --bearerToken <token> [--envFile <path>]',
        )
        console.log()
        console.log(yellow('Arguments:'))
        console.log('  file-path           Path to file exporting slash commands')
        console.log("  bearer-token        Owner's bearer token for authentication")
        console.log()
        console.log(yellow('Options:'))
        console.log('  -f, --file <path>         Path to commands file')
        console.log('  -t, --bearerToken <token> Bearer token')
        console.log('  -e, --envFile <path>      Path to .env file (default: .env)')
        console.log()
        console.log(yellow('Note:'))
        console.log(
            '  The bot address and environment are read from APP_PRIVATE_DATA in your .env file',
        )
        process.exit(1)
    }

    // Load environment variables from the specified .env file
    const envPath = path.resolve(envFile)
    if (!fs.existsSync(envPath)) {
        console.error(red(`Error: Environment file not found: ${envPath}`))
        console.log(yellow('Please ensure your .env file exists and contains APP_PRIVATE_DATA'))
        process.exit(1)
    }

    dotenv.config({ path: envPath })

    // Get APP_PRIVATE_DATA from environment
    const appPrivateDataStr = process.env.APP_PRIVATE_DATA
    if (!appPrivateDataStr) {
        console.error(red('Error: APP_PRIVATE_DATA not found in environment variables'))
        console.log(yellow('Please ensure your .env file contains APP_PRIVATE_DATA'))
        process.exit(1)
    }

    // Parse APP_PRIVATE_DATA to get private key and environment
    let privateKey: string
    let env: string | undefined
    try {
        const appPrivateData = parseAppPrivateData(appPrivateDataStr)
        privateKey = appPrivateData.privateKey
        env = appPrivateData.env
    } catch {
        console.error(red('Error: Failed to parse APP_PRIVATE_DATA'))
        console.log(yellow('Please ensure APP_PRIVATE_DATA is in the correct format'))
        process.exit(1)
    }

    if (!env) {
        // Old format isn't supported.
        console.error(red('Error: Environment not found in APP_PRIVATE_DATA'))
        process.exit(1)
    }

    // Derive app client address from private key
    let appClientAddress: string
    try {
        const wallet = new ethers.Wallet(privateKey)
        appClientAddress = wallet.address.toLowerCase()
    } catch {
        console.error(red('Error: Failed to derive address from private key'))
        process.exit(1)
    }

    try {
        // Resolve the file path
        const resolvedPath = path.resolve(filePath)

        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`File not found: ${resolvedPath}`)
        }

        // Import the commands file
        let commands: PlainMessage<SlashCommand>[]
        const fileUrl = pathToFileURL(resolvedPath).href

        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const module = await import(fileUrl)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            commands = module.default || module.commands
            if (!commands) {
                throw new Error('No default export or "commands" export found in file')
            }
        } catch (error) {
            throw new Error(
                `Failed to import commands file: ${error instanceof Error ? error.message : String(error)}`,
            )
        }

        // Validate commands structure
        if (!Array.isArray(commands)) {
            throw new Error('Commands must be an array')
        }

        for (const cmd of commands) {
            if (!cmd.name || typeof cmd.name !== 'string') {
                throw new Error(`Invalid command: missing or invalid "name" field`)
            }
            if (!cmd.description || typeof cmd.description !== 'string') {
                throw new Error(
                    `Invalid command "${cmd.name}": missing or invalid "description" field`,
                )
            }
            // Validate name format (1-32 chars, letters/numbers/underscores, starts with letter)
            if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(cmd.name)) {
                throw new Error(
                    `Invalid command name "${cmd.name}": must be 1-32 characters, contain only letters, numbers, and underscores, and start with a letter`,
                )
            }
            // Validate description length (1-256 chars)
            if (cmd.description.length < 1 || cmd.description.length > 256) {
                throw new Error(
                    `Invalid command description for "${cmd.name}": must be 1-256 characters`,
                )
            }
        }

        console.log(cyan('Found'), green(commands.length.toString()), cyan('commands:'))
        for (const cmd of commands) {
            console.log(`  /${green(cmd.name)} - ${cmd.description}`)
        }

        try {
            // Create signer context from bearer token
            const signerContext = await makeSignerContextFromBearerToken(bearerToken)

            // Get app registry URL based on environment
            const appRegistryUrl = getAppRegistryUrl(env)
            // Authenticate with the app registry
            const { appRegistryRpcClient } = await AppRegistryService.authenticate(
                signerContext,
                appRegistryUrl,
            )

            // Get the app ID from the client address
            const appId = bin_fromHexString(appClientAddress)

            // Get existing metadata
            const { metadata } = await appRegistryRpcClient.getAppMetadata({ appId })
            if (!metadata) {
                throw new Error('App not found or you do not have permission to modify it')
            }
            console.log(cyan('Bot:'), metadata.displayName)

            // Set updated metadata with properly formatted slash commands
            await appRegistryRpcClient.setAppMetadata({
                appId,
                metadata: {
                    ...metadata,
                    slashCommands: commands.map((cmd) =>
                        create(SlashCommandSchema, {
                            name: cmd.name,
                            description: cmd.description,
                        }),
                    ),
                },
            })
            const oldCommands = new Set(metadata.slashCommands)
            const newCommands = new Set(commands)
            const addedCommands = newCommands.difference(oldCommands)
            const removedCommands = oldCommands.difference(newCommands)

            console.log()
            console.log(green('✓'), 'Slash commands updated successfully!')
            console.log(cyan('Removed commands:'), removedCommands.size)
            console.log(cyan('Added commands:'), addedCommands.size)
            process.exit(0)
        } catch (authError: unknown) {
            const errorMessage = authError instanceof Error ? authError.message : String(authError)

            if (errorMessage.includes('app was not found in registry')) {
                throw new Error(
                    `Bot not found: ${appClientAddress}\n\nMake sure the bot address is correct and the bot exists on the ${env} network.`,
                )
            } else if (
                errorMessage.includes('permission') ||
                errorMessage.includes('unauthorized')
            ) {
                throw new Error(
                    `Permission denied: You don't have permission to modify this bot.\n\nMake sure the bearer token belongs to the bot owner.`,
                )
            } else if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
                throw new Error(
                    `Invalid bearer token format.\n\nPlease check that the bearer token is correctly formatted.`,
                )
            } else {
                throw new Error(
                    `Failed to update commands: ${errorMessage}\n\nPlease check your bearer token and bot address.`,
                )
            }
        }
    } catch (error) {
        console.error(red('Error:'), error instanceof Error ? error.message : error)
        process.exit(1)
    }
}
