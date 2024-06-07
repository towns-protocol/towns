import { ChannelMessage_Post_Content_Text } from '@river-build/proto'
import { StreamTimelineEvent } from '@river/sdk'

export function channelMessagePostWhere(
    filterFn: (value: ChannelMessage_Post_Content_Text) => boolean,
) {
    return (event: StreamTimelineEvent) => {
        return (
            (event.decryptedContent?.kind === 'channelMessage' &&
                event.decryptedContent?.content.payload.case === 'post' &&
                event.decryptedContent?.content.payload.value.content.case === 'text' &&
                filterFn(event.decryptedContent?.content.payload.value.content.value)) ||
            (event.localEvent?.channelMessage?.payload.case === 'post' &&
                event.localEvent?.channelMessage?.payload.value.content.case === 'text' &&
                filterFn(event.localEvent?.channelMessage?.payload.value.content.value))
        )
    }
}
