import { useParams } from 'react-router-dom'
import { useChannel } from '@river-build/react-sdk'
import { Timeline } from '@/components/blocks/timeline'
import { ChannelProvider } from '@/hooks/current-channel'
import { useCurrentSpaceId } from '@/hooks/current-space'

export const TimelineRoute = () => {
    const { channelId } = useParams<{ channelId: string }>()
    const spaceId = useCurrentSpaceId()
    const { data: channel } = useChannel(spaceId, channelId!)

    return (
        <ChannelProvider channelId={channelId}>
            <h2 className="text-2xl font-bold">
                Timeline {channel.metadata?.name ? `#${channel.metadata.name}` : ''}
            </h2>
            <Timeline />
        </ChannelProvider>
    )
}
