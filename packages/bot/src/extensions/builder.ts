import { ethers } from 'ethers'
import { SpaceDapp } from '@towns-protocol/web3'
import {
    createTownsClient,
    parseAppPrivateData,
    townsEnv,
    type CreateTownsClientParams,
} from '@towns-protocol/sdk'
import { bin_fromHexString } from '@towns-protocol/utils'
import { http, type Hex, type Address, createWalletClient } from 'viem'
import { readContract } from 'viem/actions'
import { base, baseSepolia, foundry } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import appRegistryAbi from '@towns-protocol/generated/dev/abis/IAppRegistry.abi'

import { EventDedup } from '../eventDedup'
import type { BotExtension, BotBuildContext, BotRuntime, OnBuildContext } from './types'

// Forward declaration - Bot class will be imported dynamically to avoid circular deps
// Use BotCommand[] as the generic parameter for flexibility with extensions
type BotInstance = import('../bot').Bot<import('../bot').BotCommand[]>

/**
 * Builder for constructing Bot instances with composable extensions.
 *
 * @example
 * ```typescript
 * const bot = await createBot()
 *   .extend(dedup({ maxSizePerStream: 1000 }))
 *   .extend(identity({ domain: 'bot.example.com', name: 'My Bot' }))
 *   .extend(commands([{ name: 'help', description: 'Show help' }]))
 *   .build(appPrivateData, jwtSecret)
 * ```
 */
export class BotBuilder {
    private extensions: BotExtension[] = []

    /**
     * Add an extension to the builder.
     * Extensions are processed in order during build.
     */
    extend<E extends BotExtension>(ext: E): this {
        this.extensions.push(ext)
        return this
    }

    /**
     * Build the bot with all configured extensions.
     *
     * @param appPrivateData - Base64-encoded app credentials
     * @param jwtSecretBase64 - Base64-encoded JWT secret for webhook auth
     * @param opts - Additional options for the Towns client
     */
    async build(
        appPrivateData: string,
        jwtSecretBase64: string,
        opts: {
            baseRpcUrl?: string
        } & Partial<Omit<CreateTownsClientParams, 'env' | 'encryptionDevice'>> = {},
    ): Promise<BotInstance> {
        const { baseRpcUrl, ...clientOpts } = opts

        // Parse credentials
        let appAddress: Address | undefined
        const {
            privateKey,
            encryptionDevice,
            env,
            appAddress: appAddressFromPrivateData,
        } = parseAppPrivateData(appPrivateData)

        if (!env) {
            throw new Error('Failed to parse APP_PRIVATE_DATA')
        }
        if (appAddressFromPrivateData) {
            appAddress = appAddressFromPrivateData
        }

        const account = privateKeyToAccount(privateKey as Hex)

        // Set up chain config
        const baseConfig = townsEnv().makeBaseChainConfig(env)
        const getChain = (chainId: number) => {
            if (chainId === base.id) return base
            if (chainId === foundry.id) return foundry
            return baseSepolia
        }
        const chain = getChain(baseConfig.chainConfig.chainId)

        const viem = createWalletClient({
            account,
            transport: baseRpcUrl
                ? http(baseRpcUrl, { batch: true })
                : http(baseConfig.rpcUrl, { batch: true }),
            chain,
        })

        const spaceDapp = new SpaceDapp(
            baseConfig.chainConfig,
            new ethers.providers.JsonRpcProvider(baseRpcUrl || baseConfig.rpcUrl),
        )

        // Get app address if not in credentials
        if (!appAddress) {
            appAddress = await readContract(viem, {
                address: baseConfig.chainConfig.addresses.appRegistry,
                abi: appRegistryAbi,
                functionName: 'getAppByClient',
                args: [account.address],
            })
        }

        // Import Bot class dynamically to avoid circular deps
        const { Bot, buildBotActions } = await import('../bot')

        // Create Towns client
        const client = await createTownsClient({
            privateKey,
            env,
            encryptionDevice: {
                fromExportedDevice: encryptionDevice,
            },
            ...clientOpts,
        }).then((x) =>
            x.extend((townsClient) => buildBotActions(townsClient, viem, spaceDapp, appAddress!)),
        )

        // Build phase: collect runtime slices from extensions
        const buildContext: BotBuildContext = {}
        const runtimeSlices: Record<string, unknown>[] = []

        for (const ext of this.extensions) {
            try {
                const slice = ext.build(buildContext)
                runtimeSlices.push(slice)
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error)
                throw new Error(
                    `[@towns-protocol/bot] Extension "${ext.name}" failed to build: ${errorMessage}`,
                    { cause: error },
                )
            }
        }

        // Merge runtime slices with conflict detection and property ownership tracking
        const mergedRuntime: Record<string, unknown> = {}
        const propertyOwners = new Map<string, string[]>()

        for (let i = 0; i < runtimeSlices.length; i++) {
            const slice = runtimeSlices[i]
            const extName = this.extensions[i]?.name ?? `extension-${i}`

            for (const [key, value] of Object.entries(slice)) {
                if (key in mergedRuntime) {
                    const owners = propertyOwners.get(key) ?? []
                    owners.push(extName)
                    propertyOwners.set(key, owners)

                    throw new Error(
                        `[@towns-protocol/bot] Conflicting extensions: "${owners.join(
                            '" and "',
                        )}" both add "${key}" property to runtime. Extensions must not conflict.`,
                    )
                }

                mergedRuntime[key] = value
                propertyOwners.set(key, [extName])
            }
        }

        // Ensure dedup always exists (create default if not provided)
        if (!('dedup' in mergedRuntime)) {
            mergedRuntime.dedup = new EventDedup()
        }

        const runtime = mergedRuntime as BotRuntime

        // Create Bot instance
        // Cast to BotInstance since we can't preserve generic through dynamic import
        const bot = new Bot(client, viem, jwtSecretBase64, appAddress!, runtime) as BotInstance

        // onBuild phase: call hooks with full context
        const onBuildContext: OnBuildContext = {
            client,
            viem,
            appAddress: appAddress!,
            botId: account.address,
        }

        // Collect async onBuild promises for parallel execution
        const onBuildPromises: Promise<void>[] = []
        for (const ext of this.extensions) {
            if (ext.onBuild) {
                try {
                    const result = ext.onBuild(runtime, onBuildContext)
                    if (result instanceof Promise) {
                        onBuildPromises.push(
                            result.catch(error => {
                                const errorMessage =
                                    error instanceof Error
                                        ? error.message
                                        : String(error)
                                throw new Error(
                                    `[@towns-protocol/bot] Extension "${ext.name}" hook onBuild failed: ${errorMessage}`,
                                    { cause: error },
                                )
                            }),
                        )
                    }
                } catch (error) {
                    const errorMessage =
                        error instanceof Error ? error.message : String(error)
                    throw new Error(
                        `[@towns-protocol/bot] Extension "${ext.name}" hook onBuild failed: ${errorMessage}`,
                        { cause: error },
                    )
                }
            }
        }

        // Wait for all async onBuild hooks to complete
        if (onBuildPromises.length > 0) {
            await Promise.all(onBuildPromises)
        }

        // Upload device keys
        await client.uploadDeviceKeys()

        return bot
    }
}

/**
 * Create a new bot builder for composing extensions.
 *
 * @example
 * ```typescript
 * const bot = await createBot()
 *   .extend(dedup())
 *   .extend(commands([{ name: 'help', description: 'Show help' }]))
 *   .build(appPrivateData, jwtSecret)
 * ```
 */
export function createBot(): BotBuilder {
    return new BotBuilder()
}
