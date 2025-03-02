import { check, shortenHexString } from '@river-build/dlog'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { getSystemInfo } from '../../utils/systemInfo'
import { channelMessagePostWhere } from '../../utils/timeline'
import { isDefined } from '@river-build/sdk'
import { makeCodeBlock } from '../../utils/messages'

export async function summarizeChat(
    localClients: StressClient[],
    cfg: ChatConfig,
    errors: unknown[],
) {
    const processLeadClient = localClients[0]
    const logger = processLeadClient.logger.child({ name: 'summarizeChat' })
    logger.debug('summarizeChat')
    const defaultChannel = processLeadClient.streamsClient.stream(cfg.announceChannelId)
    check(isDefined(defaultChannel), 'defaultChannel not found')
    // find the message in the default channel that contains the session id, this should already be there decrypted
    const message = defaultChannel.view.timeline.find(
        channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
    )

    if (!message) {
        logger.error({ defaultChannel }, 'message not found')
        return {
            containerIndex: cfg.containerIndex,
            processIndex: cfg.processIndex,
            freeMemory: getSystemInfo().FreeMemory,
            checkinCounts: {},
            errors: [
                `message not found in ${cfg.announceChannelId} that includes ${cfg.sessionId}`,
            ],
        }
    }

    const checkinCounts: Record<string, Record<string, number>> = {}

    // loop over clients and do summaries
    for (const client of localClients) {
        for (const channelId of cfg.channelIds) {
            // for each channel, count the number of joinChat checkins we got (look for sessionId)
            const messages = client.streamsClient.stream(channelId)?.view.timeline

            const checkInMessages =
                messages?.filter(
                    channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
                ) ?? []

            const key = shortenHexString(channelId)
            const count = checkinCounts[key]?.[checkInMessages.length.toString()] ?? 0
            checkinCounts[key] = {
                ...checkinCounts[key],
                [checkInMessages.length.toString()]: count + 1,
            }
        }
    }

    const summary = {
        containerIndex: cfg.containerIndex,
        processIndex: cfg.processIndex,
        freeMemory: getSystemInfo().FreeMemory,
        checkinCounts,
        errors,
    }

    await processLeadClient.sendMessage(cfg.announceChannelId, `Done ${makeCodeBlock(summary)}`, {
        threadId: message.hashStr,
    })

    return summary
}
