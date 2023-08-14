import React, { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Stack } from '@ui'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'

export const DirectMessageThread = () => {
    const { messageId } = useParams()
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const onBack = useCallback(() => {
        navigate(`/${PATHS.MESSAGES}`)
    }, [navigate])

    return (
        <Stack>
            {isTouch && <TouchPanelNavigationBar title="Message Thread" onBack={onBack} />}
            <Stack padding>The message thread with id {messageId} will appear here</Stack>
        </Stack>
    )
}
