import { isDMChannelStreamId, isGDMChannelStreamId } from '@river/sdk'
import { PATHS } from 'routes'

export const getLinkToMessage = (params: {
    spaceId?: string
    channelId?: string
    eventId: string
}) => {
    const { spaceId, channelId, eventId } = params
    let link = ''
    if (channelId && (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId))) {
        link = `/${PATHS.MESSAGES}/${channelId}#${eventId}`
    } else {
        link = `/${PATHS.SPACES}/${spaceId}/${PATHS.CHANNELS}/${channelId}#${eventId}`
    }
    return link ? `${location.origin}${link}` : undefined
}
