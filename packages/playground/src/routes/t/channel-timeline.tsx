import { useParams } from 'react-router-dom'
import { useChannel, useSyncAgent, useThreads, useTimeline } from '@river-build/react-sdk'
import { useState } from 'react'
import { Timeline } from '@/components/blocks/timeline'
import { ChannelProvider } from '@/hooks/current-channel'
import { useCurrentSpaceId } from '@/hooks/current-space'

export const ChannelTimelineRoute = () => {
    const { channelId } = useParams<{ channelId: string }>()
    const spaceId = useCurrentSpaceId()
    const { data: channel } = useChannel(spaceId, channelId!)
    const { data: events } = useTimeline(channelId!)
    const { data: threads } = useThreads(channelId!)
    const [isJoining, setIsJoining] = useState(false)
    const syncAgent = useSyncAgent()
    const joinChannel = () => {
        if (!channelId) {
            return
        }
        setIsJoining(true)
        syncAgent.spaces
            .getSpace(spaceId)
            .getChannel(channelId)
            .join()
            .then(() => {
                setIsJoining(false)
            })
            .catch((error) => {
                console.error(error)
                setIsJoining(false)
            })
    }

    return (
        <ChannelProvider channelId={channelId}>
            <h2 className="text-2xl font-bold">
                Channel Timeline {channel.metadata?.name ? `#${channel.metadata.name}` : ''}
            </h2>
            <>
                {!isJoining && channelId && !channel.isJoined ? (
                    <button
                        className="flex h-8 w-full items-center justify-center gap-2 rounded-sm border border-neutral-200 bg-neutral-100 px-2 dark:border-neutral-800 dark:bg-neutral-900"
                        disabled={isJoining}
                        onClick={joinChannel}
                    >
                        {isJoining ? 'Joining...' : 'Join Channel'}
                    </button>
                ) : (
                    <Timeline streamId={channelId!} events={events} threads={threads} />
                )}
            </>
        </ChannelProvider>
    )
}
