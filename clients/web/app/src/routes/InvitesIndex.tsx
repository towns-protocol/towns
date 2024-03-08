import React, { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useInviteData, useTownsClient } from 'use-towns-client'
import { PATHS } from 'routes'
import { SpaceJoin } from '@components/Web3/SpaceJoin'

export const InvitesIndex = () => {
    const { inviteSlug } = useParams()
    const { leaveRoom } = useTownsClient()
    const navigate = useNavigate()
    const invite = useInviteData(inviteSlug)

    const onSuccessfulJoin = useCallback(async () => {
        if (!invite?.id) {
            return
        }
        navigate(
            invite.isSpaceRoom
                ? `/${PATHS.SPACES}/${invite.id}/`
                : // TODO: we don't have UI for channel invites so we should either remove this or refactor once channel flow is done
                  '/' + invite.spaceParentId + '/channels/' + invite.id + '/',
        )
    }, [invite, navigate])

    const onDecline = useCallback(async () => {
        if (!invite?.id) {
            console.error('onDecline Room Invite, space undefined')
            return
        }
        await leaveRoom(invite.id)
        navigate('/')
    }, [invite?.id, leaveRoom, navigate])

    return (
        <>
            {invite ? (
                <>
                    <SpaceJoin
                        joinData={{
                            name: invite.name,
                            networkId: invite.id,
                        }}
                        onCancel={onDecline}
                        onSuccessfulJoin={onSuccessfulJoin}
                    />
                </>
            ) : (
                <p>Invite &quot;{inviteSlug}&quot; not found</p>
            )}
        </>
    )
}
