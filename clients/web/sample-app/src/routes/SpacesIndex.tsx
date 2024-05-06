import React, { useCallback, useState } from 'react'
import {
    Membership,
    useMyMembership,
    useSpaceData,
    useSpaceTimeline,
    useTownsClient,
} from 'use-towns-client'
import { useNavigate } from 'react-router-dom'
import { LargeToast } from '@components/LargeToast'
import { ChatMessages } from '../components/ChatMessages'

export const SpacesIndex = () => {
    // console.log("SPACES INDEX");
    const navigate = useNavigate()
    const space = useSpaceData()
    const membership = useMyMembership(space?.id)
    const { timeline } = useSpaceTimeline()

    const { leaveRoom, joinRoom, resetFullyReadMarkers } = useTownsClient()
    const [joinFailed, setJoinFailed] = useState(false)
    const [clipboarded, setClipboarded] = useState(false)

    const onClickInvite = useCallback(() => {
        if (space?.id) {
            navigate('/spaces/' + space.id + '/invite')
        }
    }, [space?.id, navigate])

    const onCreateChannelClick = useCallback(() => {
        navigate('/spaces/' + space?.id + '/channels/new')
    }, [navigate, space?.id])

    const onClickCopy = useCallback(() => {
        const text = `${window.location.protocol}//${window.location.host}/spaces/${space?.id}/`
        navigator.clipboard.writeText(text).then(() => {
            setClipboarded(true)
            setTimeout(() => {
                setClipboarded(false)
            }, 1000)
        })
    }, [space?.id])

    const onClickLeaveSpace = useCallback(async () => {
        if (space?.id) {
            await leaveRoom(space.id)
            navigate('/')
        }
    }, [leaveRoom, navigate, space?.id])

    const onClickMarkAllAsRead = useCallback(async () => {
        resetFullyReadMarkers()
    }, [resetFullyReadMarkers])

    const onClickJoinRoom = useCallback(
        async (roomId: string) => {
            const room = await joinRoom(roomId)
            if (!room) {
                setJoinFailed(true)
            } else {
                setJoinFailed(false)
            }
        },
        [joinRoom],
    )

    return space ? (
        <>
            {membership === Membership.Join && (
                <>
                    <div>
                        <button onClick={onCreateChannelClick}>Create a channel</button>
                    </div>
                    <div>
                        <button onClick={onClickCopy}>Copy town link</button>{' '}
                        {clipboarded && 'Copied!'}
                    </div>
                    <div>
                        <button onClick={onClickInvite}>Invite</button>
                    </div>
                    <div>
                        <button onClick={onClickLeaveSpace}>Leave space</button>
                    </div>
                    <div>
                        <button onClick={onClickMarkAllAsRead}>Mark all as read</button>
                    </div>
                </>
            )}
            <h3>Space Messages</h3>
            <ChatMessages
                roomId={space.id}
                timeline={timeline}
                membership={membership}
                sendMessage={undefined}
                joinRoom={onClickJoinRoom}
            />
            {joinFailed ? <LargeToast message="Join room failed" /> : null}
        </>
    ) : (
        <h1>Space not found</h1>
    )
}
