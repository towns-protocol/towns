import { EventDedup, type EventDedupConfig } from '../eventDedup'
import type { BotExtension, BotBuildContext } from './types'

/**
 * Event deduplication extension.
 *
 * Provides in-memory deduplication of bot events to prevent duplicate processing
 * when the App Registry replays events during restarts.
 *
 * @param config - Optional configuration for the dedup cache
 *
 * @example
 * ```typescript
 * const bot = await createBot()
 *   .extend(dedup({ maxSizePerStream: 1000 }))
 *   .build(appPrivateData, jwtSecret)
 * ```
 */
export function dedup(config?: EventDedupConfig): BotExtension<{ dedup: EventDedup }> {
    return {
        name: 'dedup',
        build(_ctx: BotBuildContext): { dedup: EventDedup } {
            return { dedup: new EventDedup(config) }
        },
    }
}
