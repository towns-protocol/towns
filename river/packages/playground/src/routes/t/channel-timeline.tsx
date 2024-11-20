import { useParams } from 'react-router-dom'
import { useChannel, useThreads, useTimeline } from '@river-build/react-sdk'
import { Timeline } from '@/components/blocks/timeline'
import { ChannelProvider } from '@/hooks/current-channel'
import { useCurrentSpaceId } from '@/hooks/current-space'

export const ChannelTimelineRoute = () => {
    const { channelId } = useParams<{ channelId: string }>()
    const spaceId = useCurrentSpaceId()
    const { data: channel } = useChannel(spaceId, channelId!)
    const { data: events } = useTimeline(channelId!)
    const { data: threads } = useThreads(channelId!)
    return (
        <ChannelProvider channelId={channelId}>
            <h2 className="text-2xl font-bold">
                Channel Timeline {channel.metadata?.name ? `#${channel.metadata.name}` : ''}
            </h2>
            <Timeline streamId={channelId!} events={events} threads={threads} />
        </ChannelProvider>
    )
}
