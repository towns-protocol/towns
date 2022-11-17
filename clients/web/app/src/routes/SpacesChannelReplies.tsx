import React, { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
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

    const eventHash = window.location.hash?.replace(/^#/, '')
    const highlightId = eventHash?.match(/^\$[a-z0-9_-]{16,128}/i) ? eventHash : undefined

    return (
        <Box grow height="100%" overflow="hidden">
            {isValid ? (
                <>
                    <Box grow padding="lg">
                        <Box absoluteFill padding gap paddingBottom="lg" position="relative">
                            <WindowedMessageThread
                                key={messageId}
                                messageId={messageId}
                                highlightId={highlightId}
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
