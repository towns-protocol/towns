import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { PATHS } from 'routes'
import { addressFromSpaceId } from 'ui/utils/utils'

export const getLinkToMessage = (params: {
    spaceId?: string
    channelId?: string
    threadId?: string
    eventId: string
}) => {
    const { spaceId, channelId, threadId, eventId } = params
    const spaceAddress = addressFromSpaceId(spaceId)
    let link = ''
    if (channelId && (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId))) {
        link = `/${PATHS.MESSAGES}/${channelId}#${eventId}`
    } else if (threadId) {
        link = `/${PATHS.SPACES}/${spaceAddress}/${PATHS.CHANNELS}/${channelId}/${PATHS.REPLIES}/${threadId}#${eventId}`
    } else {
        link = `/${PATHS.SPACES}/${spaceAddress}/${PATHS.CHANNELS}/${channelId}#${eventId}`
    }
    return link ? `${location.origin}${link}` : undefined
}
