import { useParams } from 'react-router-dom'
import { MetadataBlock } from '@/components/blocks/metadata'
import { TimelineBlock } from '@/components/blocks/timeline'
import { ChannelProvider } from '@/hooks/current-channel'

export const ChannelRoute = () => {
    const { channelId } = useParams<{ channelId: string }>()

    return (
        <ChannelProvider channelId={channelId}>
            <MetadataBlock />
            <div className="col-span-2">
                <TimelineBlock />
            </div>
        </ChannelProvider>
    )
}
