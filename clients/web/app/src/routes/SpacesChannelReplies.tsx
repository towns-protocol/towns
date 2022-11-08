import React, { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ZTEvent, useChannelTimeline } from 'use-zion-client'
import { Box } from '@ui'
import { WindowedMessageThread } from '@components/MessageThread'

export const SpacesChannelReplies = (props: {
    children?: React.ReactNode
    parentRoute?: string
}) => {
    const { parentRoute = '..' } = props
    const { messageId } = useParams()
    const navigate = useNavigate()

    const handleClose = useCallback(() => {
        navigate(parentRoute)
    }, [navigate, parentRoute])

    const isValid = !!messageId
    const timeline = useChannelTimeline()
    const channelMessages = useMemo(
        () => timeline.filter((m) => m.content?.kind === ZTEvent.RoomMessage),
        [timeline],
    )

    return (
        <Box grow height="100%" overflow="hidden">
            {isValid ? (
                <>
                    <Box grow padding="lg">
                        <Box absoluteFill padding gap paddingBottom="lg" position="relative">
                            <WindowedMessageThread
                                key={messageId}
                                messageId={messageId}
                                channelMessages={channelMessages}
                                onClose={handleClose}
                            />
                        </Box>
                    </Box>

                    <Box paddingBottom="lg" paddingX="lg" />
                </>
            ) : (
                <>Invalid Thread</>
            )}
        </Box>
    )
}

export default SpacesChannelReplies
