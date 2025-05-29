import { ChannelMessage_Post_Content_Text } from '@towns-protocol/proto'
import { ChannelMessageEvent, RiverTimelineEvent, TimelineEvent } from '@towns-protocol/sdk'

export function channelMessagePostWhere(filterFn: (value: ChannelMessageEvent) => boolean) {
    return (event: TimelineEvent) => {
        return event.content?.kind === RiverTimelineEvent.ChannelMessage && filterFn(event.content)
    }
}
