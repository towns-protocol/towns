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

    return (
        <Box grow height="100%" overflow="hidden">
            {isValid ? (
                <>
                    <Box grow padding="lg">
                        <Box absoluteFill padding gap paddingBottom="lg" position="relative">
                            <WindowedMessageThread
                                key={messageId}
                                messageId={messageId}
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
