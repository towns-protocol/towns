import type { ClientV2 } from '@towns-protocol/sdk'
import type { WalletClient, Transport, Chain, Account, Address } from 'viem'
import type { EventDedup } from '../eventDedup'
import type { BotIdentityConfig } from '../identity-types'
import type { BotCommand } from '../bot'

// Re-export BotCommand for convenience - canonical definition is in bot.ts
export type { BotCommand }

/**
 * Context available during the build() phase of extensions.
 * This phase runs before the client is initialized, so context is minimal.
 */
export type BotBuildContext = {}

/**
 * Context available during the onBuild() phase of extensions.
 * This phase runs after the client is fully initialized.
 */
export type OnBuildContext = {
    client: ClientV2<any>
    viem: WalletClient<Transport, Chain, Account>
    appAddress: Address
    botId: string
}

/**
 * Runtime configuration passed to the Bot class.
 * Contains all extension-provided functionality.
 */
export type BotRuntime = {
    /** Event deduplication - always present */
    dedup: EventDedup
    /** ERC-8004 identity configuration */
    identity?: BotIdentityConfig
    /** Slash commands */
    commands?: BotCommand[]
}

/**
 * Interface for bot extensions.
 * Extensions add functionality to the bot runtime in a composable way.
 *
 * @template R - The runtime slice this extension contributes
 *
 * @example
 * ```typescript
 * const myExtension: BotExtension<{ myFeature: MyFeature }> = {
 *   name: 'my-extension',
 *   build(ctx) {
 *     return { myFeature: new MyFeature() }
 *   },
 *   async onBuild(runtime, ctx) {
 *     // Post-initialization setup
 *   }
 * }
 * ```
 */
export interface BotExtension<R extends Record<string, unknown> = {}> {
    /** Unique name for this extension */
    name: string

    /**
     * Build phase - creates the runtime slice for this extension.
     * Called before the Bot is instantiated.
     */
    build: (ctx: BotBuildContext) => R

    /**
     * Post-build hook - runs after the Bot is fully initialized.
     * Use this for async setup that requires the client.
     */
    onBuild?: (runtime: BotRuntime, ctx: OnBuildContext) => void | Promise<void>
}
