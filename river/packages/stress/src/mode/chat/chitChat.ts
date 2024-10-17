import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from '../common/types'
import { makeSillyMessage } from '../../utils/messages'
import { getLogger } from '../../utils/logger'

export async function chitChat(client: StressClient, cfg: ChatConfig) {
    const { channelIds, duration, averageWaitTimeout } = cfg
    const logger = getLogger('stress:chitchat', { logId: client.logId })
    // for cfg.duration seconds, randomly every 1-5 seconds, send a message to one of cfg.channelIds
    const end = Date.now() + duration * 1000
    const randomChannel = () => channelIds[Math.floor(Math.random() * channelIds.length)]
    // wait at least 1 second between messages across all clients
    logger.info({ chattingUntil: end, averageWaitTimeout }, 'chitChat')
    while (Date.now() < end) {
        await client.sendMessage(randomChannel(), `${makeSillyMessage()}`)
        await new Promise((resolve) => setTimeout(resolve, Math.random() * averageWaitTimeout))
    }
}
