import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { BoxProps, IconButton, IconName } from '@ui'
import { useShortcut } from 'hooks/useShortcut'
import { useCreateLink } from 'hooks/useCreateLink'
import { Panel } from '@components/Panel/Panel'
import { PanelStack } from '@components/Panel/PanelContext'
import { useAnalytics } from 'hooks/useAnalytics'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { env } from 'utils'
import { useDevice } from 'hooks/useDevice'
import { DirectMessageList } from './DirectMessageList'

export const DirectMessagesPanel = () => {
    const navigate = useNavigate()
    const { createLink } = useCreateLink()
    const { analytics } = useAnalytics()

    const onDisplayCreate = useCallback(() => {
        analytics?.track('clicked new direct message', {}, () => {
            console.log('[analytics]', 'clicked new direct message')
        })
        const link = createLink({ messageId: 'new' })
        if (link) {
            navigate(`${link}?stackId=${PanelStack.DIRECT_MESSAGES}`)
        }
    }, [analytics, createLink, navigate])

    useShortcut('CreateMessage', onDisplayCreate)

    return <MessageListPanel onNavAction={onDisplayCreate} />
}

const MessageListPanel = ({ onNavAction }: { onNavAction: () => void }) => {
    const { isTouch } = useDevice()

    return (
        <Panel
            isRootPanel
            stackId={PanelStack.DIRECT_MESSAGES}
            label="Direct Messages"
            rightBarButton={<PanelHeaderButton icon="compose" onClick={onNavAction} />}
            padding="sm"
        >
            <DirectMessageList />
            {(!env.DEV || env.VITE_PUSH_NOTIFICATION_ENABLED) && !isTouch && <ReloadPrompt />}
        </Panel>
    )
}

const PanelHeaderButton = ({ icon, ...boxProps }: { icon: IconName } & Omit<BoxProps, 'size'>) => {
    return (
        <IconButton
            icon={icon}
            size="square_sm"
            color="default"
            insetRight="xs"
            background="level2"
            {...boxProps}
        />
    )
}
