import type { BotIdentityConfig } from '../identity-types'
import type { BotExtension, BotBuildContext } from './types'

/**
 * ERC-8004 identity extension.
 *
 * Configures the bot's on-chain identity metadata for the
 * `/.well-known/agent-metadata.json` endpoint.
 *
 * @param config - Identity configuration including name, description, domain, etc.
 *
 * @example
 * ```typescript
 * const bot = await createBot()
 *   .extend(identity({
 *     name: 'My Bot',
 *     description: 'A helpful bot',
 *     image: 'https://example.com/avatar.png',
 *     domain: 'bot.example.com',
 *   }))
 *   .build(appPrivateData, jwtSecret)
 * ```
 */
export function identity(config: BotIdentityConfig): BotExtension<{ identity: BotIdentityConfig }> {
    return {
        name: 'identity',
        build(_ctx: BotBuildContext): { identity: BotIdentityConfig } {
            return { identity: config }
        },
    }
}
