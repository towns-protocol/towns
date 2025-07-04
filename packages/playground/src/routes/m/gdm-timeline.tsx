import { useGdm, useMemberList, useSyncAgent, useTimeline } from '@towns-protocol/react-sdk'
import { useParams } from 'react-router-dom'
import { useEffect, useCallback } from 'react'
import { Timeline } from '@/components/blocks/timeline'
import { shortenAddress } from '@/utils/address'

export const GdmTimelineRoute = () => {
    const { gdmStreamId } = useParams<{ gdmStreamId: string }>()
    const { data: gdm } = useGdm(gdmStreamId!)
    const { data: timeline } = useTimeline(gdmStreamId!)
    const { data: members } = useMemberList(gdmStreamId!)
    const sync = useSyncAgent()

    const formatMemberNames = useCallback(() => {
        if (!members?.initialized || members.userIds.length === 0) {
            return 'Group Chat'
        }

        const otherUserIds = members.userIds.filter(userId => userId !== sync.userId)
        
        if (otherUserIds.length === 0) {
            return 'Group Chat'
        }

        if (otherUserIds.length <= 2) {
            const names = otherUserIds.map(userId => {
                const member = sync.gdms.getGdm(gdmStreamId!).members.get(userId)
                const memberData = member.data
                return memberData.displayName || memberData.username || shortenAddress(userId)
            })
            return names.join(', ')
        } else {
            const firstMember = sync.gdms.getGdm(gdmStreamId!).members.get(otherUserIds[0])
            const firstMemberData = firstMember.data
            const firstName = firstMemberData.displayName || firstMemberData.username || shortenAddress(otherUserIds[0])
            
            const secondMember = sync.gdms.getGdm(gdmStreamId!).members.get(otherUserIds[1])
            const secondMemberData = secondMember.data
            const secondName = secondMemberData.displayName || secondMemberData.username || shortenAddress(otherUserIds[1])
            
            const remainingCount = otherUserIds.length - 2
            return `${firstName}, ${secondName} and ${remainingCount} other${remainingCount > 1 ? 's' : ''}`
        }
    }, [members, sync, gdmStreamId])

    useEffect(() => {
        if (gdm && gdm.initialized) {
            const gdmName = gdm.metadata?.name || formatMemberNames()
            document.title = `${gdmName} (DM) - TOWNS LABS`
        }
    }, [gdm, members, formatMemberNames])

    return (
        <>
            <h2 className="text-2xl font-bold">
                Group Chat Timeline {gdm.metadata?.name ? `#${gdm.metadata.name}` : ''}
            </h2>
            <Timeline events={timeline} streamId={gdmStreamId!} />
        </>
    )
}
