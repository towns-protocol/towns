import { dlogger } from '@river-build/dlog'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'
import { makeSillyMessage } from '../../utils/messages'

export async function chitChat(client: StressClient, cfg: ChatConfig) {
    const logger = dlogger(`stress:chitchat:${client.logId}`)
    // for cfg.duration seconds, randomly every 1-5 seconds, send a message to one of cfg.channelIds
    const end = Date.now() + cfg.duration * 1000
    const channelIds = cfg.channelIds
    const randomChannel = () => channelIds[Math.floor(Math.random() * channelIds.length)]
    // wait at least 1 second between messages across all clients
    const averateWaitTime = (1000 * cfg.clientsCount * 2) / cfg.channelIds.length
    logger.log('chitChat', { chattingUntil: end, averageWait: averateWaitTime })
    while (Date.now() < end) {
        await client.sendMessage(randomChannel(), `${makeSillyMessage()}`)
        await new Promise((resolve) => setTimeout(resolve, Math.random() * averateWaitTime))
    }
}
