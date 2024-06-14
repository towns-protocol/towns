import { check, dlogger, shortenHexString } from '@river-build/dlog'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'
import { getSystemInfo } from '../../utils/systemInfo'
import { channelMessagePostWhere } from '../../utils/timeline'
import { isDefined } from '@river/sdk'
import { makeCodeBlock } from '../../utils/messages'

export async function sumarizeChat(
    localClients: StressClient[],
    cfg: ChatConfig,
    errors: unknown[],
) {
    const logger = dlogger('stress:sumarizeChat')
    const processLeadClient = localClients[0]
    logger.log('sumarizeChat', processLeadClient.userId)
    const defaultChannel = processLeadClient.streamsClient.stream(cfg.announceChannelId)
    check(isDefined(defaultChannel), 'defaultChannel not found')
    // find the message in the default channel that contains the session id, this should already be there decrypted
    const message = defaultChannel.view.timeline.find(
        channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
    )
    check(isDefined(message), 'message not found')

    const checkinCounts: Record<string, Record<string, number>> = {}

    // loop over clients and do summaries
    for (const client of localClients) {
        for (const channelId of cfg.channelIds) {
            // for each channel, count the number of joinChat checkins we got (look for sessionId)
            const messages = client.streamsClient.stream(channelId)?.view.timeline

            const checkInMesssages =
                messages?.filter(
                    channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
                ) ?? []

            const key = shortenHexString(channelId)
            const count = checkinCounts[key]?.[checkInMesssages.length.toString()] ?? 0
            checkinCounts[key] = {
                ...checkinCounts[key],
                [checkInMesssages.length.toString()]: count + 1,
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
