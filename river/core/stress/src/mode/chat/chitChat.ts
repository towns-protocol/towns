import { dlogger } from '@river-build/dlog'
import { StressClient } from '../../utils/stressClient'
import { ChatConfig } from './types'

export async function chitChat(client: StressClient, cfg: ChatConfig) {
    const logger = dlogger(`stress:chitchat:${client.logId}`)
    // for cfg.duration seconds, randomly every 1-5 seconds, send a message to one of cfg.channelIds
    const end = cfg.startedAtMs + cfg.duration * 1000
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
function makeSillyMessage() {
    const w0 = [
        'b',
        'd',
        'f',
        'g',
        'h',
        'j',
        'k',
        'l',
        'm',
        'n',
        'p',
        'r',
        's',
        't',
        'v',
        'w',
        'y',
        'z',
        'ch',
        'sh',
        'th',
        'zh',
        'ng',
    ]
    const w1 = ['a', 'e', 'i', 'o', 'u', 'ə', 'ɑ', 'æ', 'ɛ', 'ɪ', 'i', 'ɔ', 'ʊ', 'u', 'ʌ']
    const w2 = [
        'ai',
        'au',
        'aw',
        'ay',
        'ea',
        'ee',
        'ei',
        'eu',
        'ew',
        'ey',
        'ie',
        'oa',
        'oi',
        'oo',
        'ou',
        'ow',
        'oy',
        'ar',
        'er',
        'ir',
        'or',
        'ur',
    ]

    const wo = () =>
        w0[Math.floor(Math.random() * w0.length)] + w1[Math.floor(Math.random() * w1.length)]
    // range over 0...Math.floor(Math.random()*3) and add a random wo

    const word = () => {
        const prefix = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, wo).join('')
        const suffix = Math.random() > 0.8 ? w2[Math.floor(Math.random() * w2.length)] : ''
        return prefix + suffix
    }

    return Array.from({ length: Math.floor(Math.random() * 7) + 1 }, word).join(' ')
}
