import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import * as dotenv from 'dotenv'
import { ethers } from 'ethers'
import { z } from 'zod'
import { green, red, yellow, cyan } from 'picocolors'
import {
    makeSignerContextFromBearerToken,
    AppRegistryService,
    getAppRegistryUrl,
    parseAppPrivateData,
} from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { SlashCommandSchema, type SlashCommand } from '@towns-protocol/proto'
import type { UpdateCommandsArgs } from '../parser.js'
import { create } from '@bufbuild/protobuf'

const slashCommandSchema = z
    .object({
        name: z
            .string()
            .min(1, 'Command name is required')
            .max(32, 'Command name must be 32 characters or less')
            .regex(
                /^[a-zA-Z][a-zA-Z0-9_]*$/,
                'Command name must start with a letter and contain only letters, numbers, and underscores',
            ),
        description: z
            .string()
            .min(1, 'Command description is required')
            .max(256, 'Command description must be 256 characters or less'),
    })
    .transform((data) => create(SlashCommandSchema, data))

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

    const envPath = path.resolve(envFile)
    if (!fs.existsSync(envPath)) {
        console.error(red(`Error: Environment file not found: ${envPath}`))
        console.log(yellow('Please ensure your .env file exists and contains APP_PRIVATE_DATA'))
        process.exit(1)
    }

    dotenv.config({ path: envPath })

    const appPrivateDataStr = process.env.APP_PRIVATE_DATA
    if (!appPrivateDataStr) {
        console.error(red('Error: APP_PRIVATE_DATA not found in environment variables'))
        console.log(yellow('Please ensure your .env file contains APP_PRIVATE_DATA'))
        process.exit(1)
    }

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
        const resolvedPath = path.resolve(filePath)
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`File not found: ${resolvedPath}`)
        }
        let commands: SlashCommand[] = []
        const fileUrl = pathToFileURL(resolvedPath).href
        try {
            const module = await import(fileUrl)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            commands = module.default || module.commands
            if (!commands) {
                throw new Error('No default export or "commands" export found in file')
            }
        } catch (error) {
            throw new Error(
                `Failed to import commands file: ${error instanceof Error ? error.message : String(error)}`,
            )
        }

        try {
            const validatedCommands = z.array(slashCommandSchema).parse(commands)
            commands = validatedCommands
        } catch (zodError) {
            if (zodError instanceof z.ZodError) {
                const errors = zodError.errors
                    .map((err) => {
                        const path = err.path.length > 0 ? `[${err.path.join('.')}]` : ''
                        return `  ${path} ${err.message}`
                    })
                    .join('\n')
                throw new Error(`Invalid slash commands:\n${errors}`)
            }
            throw zodError
        }

        console.log(cyan('Found'), green(commands.length.toString()), cyan('commands:'))
        for (const cmd of commands) {
            console.log(`  /${green(cmd.name)} - ${cmd.description}`)
        }

        try {
            const signerContext = await makeSignerContextFromBearerToken(bearerToken)
            const appRegistryUrl = getAppRegistryUrl(env)
            const { appRegistryRpcClient } = await AppRegistryService.authenticate(
                signerContext,
                appRegistryUrl,
            )
            const appId = bin_fromHexString(appClientAddress)

            const { metadata } = await appRegistryRpcClient.getAppMetadata({ appId })
            if (!metadata) {
                throw new Error('App not found or you do not have permission to modify it')
            }

            console.log()
            await appRegistryRpcClient.updateAppMetadata({
                appId,
                updateMask: ['slash_commands'],
                metadata: {
                    slashCommands: commands,
                },
            })

            console.log(cyan('Bot:'), metadata.displayName)
            console.log(green('✓'), 'Slash commands updated successfully!')
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
