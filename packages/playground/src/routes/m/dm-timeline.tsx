import { useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useDm, useMember, useMemberList, useSyncAgent, useTimeline } from '@towns-protocol/react-sdk'
import { Timeline } from '@/components/blocks/timeline'
import { shortenAddress } from '@/utils/address'

export const DmTimelineRoute = () => {
    const { dmStreamId } = useParams<{ dmStreamId: string }>()
    const { data: dm } = useDm(dmStreamId!)
    const { data: timeline } = useTimeline(dmStreamId!)
    const sync = useSyncAgent()
    const { data: members } = useMemberList(dmStreamId!)
    const { userId, username, displayName } = useMember({
        streamId: dmStreamId!,
        userId: members.userIds.find((userId) => userId !== sync.userId) || sync.userId,
    })

    useEffect(() => {
        const otherUserName = userId === sync.userId ? 'You' : displayName || username || shortenAddress(userId)
        document.title = `Chats · ${otherUserName} - Towns`
        
        return () => {
            document.title = 'Towns Playground'
        }
    }, [userId, displayName, username, sync.userId])

    return (
        <>
            <h2 className="text-2xl font-bold">
                Direct Message Timeline {dm.metadata?.name ? `#${dm.metadata.name}` : ''}
            </h2>
            <Timeline events={timeline} streamId={dmStreamId!} />
        </>
    )
}
