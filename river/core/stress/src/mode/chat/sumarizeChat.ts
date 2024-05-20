import { dlogger } from '@river-build/dlog'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'
import { getSystemInfo } from '../../utils/systemInfo'
import { channelMessagePostWhere } from '../../utils/timeline'

export async function sumarizeChat(client: StressClient, cfg: ChatConfig) {
    const logger = dlogger('stress:sumarizeChat')

    logger.log('sumarizeChat', client.connection.userId)
    const announceChannelId = cfg.announceChannelId
    const defaultChannel = await client.streamsClient.waitForStream(announceChannelId)
    // find the message in the default channel that contains the session id, emoji it
    const message = await client.waitFor(
        () =>
            defaultChannel.view.timeline.find(
                channelMessagePostWhere((value) => value.body.includes(cfg.sessionId)),
            ),
        { interval: 1000, timeoutMs: cfg.waitForChannelDecryptionTimeoutMs },
    )

    await client.sendMessage(
        announceChannelId,
        `c${cfg.containerIndex}p${cfg.processIndex} Done freeMemory: ${getSystemInfo().FreeMemory}`,
        { threadId: message.hashStr },
    )
}
