import { bin_fromHexString } from '@towns-protocol/utils'
import type { BotExtension, BotBuildContext, BotRuntime, OnBuildContext, BotCommand } from './types'

/**
 * Slash commands extension.
 *
 * Registers slash commands with the Towns App Registry and makes them
 * available for type-safe handling via `bot.onSlashCommand()`.
 *
 * @param cmds - Array of command definitions
 *
 * @example
 * ```typescript
 * const bot = await createBot()
 *   .extend(commands([
 *     { name: 'help', description: 'Show help' },
 *     { name: 'status', description: 'Check bot status' },
 *   ]))
 *   .build(appPrivateData, jwtSecret)
 *
 * bot.onSlashCommand('help', async (handler, event) => {
 *   await handler.sendMessage(event.channelId, 'Available commands: /help, /status')
 * })
 * ```
 */
export function commands<C extends BotCommand[]>(cmds: C): BotExtension<{ commands: C }> {
    return {
        name: 'commands',
        build(_ctx: BotBuildContext): { commands: C } {
            return { commands: cmds }
        },
        async onBuild(_runtime: BotRuntime, ctx: OnBuildContext) {
            // Register commands with App Registry
            try {
                const appRegistryClient = await ctx.client.appServiceClient()
                await appRegistryClient.updateAppMetadata({
                    appId: bin_fromHexString(ctx.botId),
                    updateMask: ['slash_commands'],
                    metadata: {
                        slashCommands: cmds,
                    },
                })
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[@towns-protocol/bot] failed to update slash commands', err)
            }
        },
    }
}
