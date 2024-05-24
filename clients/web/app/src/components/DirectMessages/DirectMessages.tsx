import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { GlobalContextUserLookupProvider } from 'use-towns-client'
import { BoxProps, IconButton, IconName } from '@ui'
import { useShortcut } from 'hooks/useShortcut'
import { useCreateLink } from 'hooks/useCreateLink'
import { Panel } from '@components/Panel/Panel'
import { PanelStack } from '@components/Panel/PanelContext'
import { DirectMessageList } from './DirectMessageList'

export const DirectMessagesPanel = () => {
    const navigate = useNavigate()
    const { createLink } = useCreateLink()
    const onDisplayCreate = useCallback(() => {
        const link = createLink({ messageId: 'new' })
        console.log('[DirectMessagesPanel][route]', 'route', { link })
        if (link) {
            navigate(`${link}?stackId=${PanelStack.DIRECT_MESSAGES}`)
        }
    }, [createLink, navigate])

    useShortcut('CreateMessage', onDisplayCreate)

    return <MessageListPanel onNavAction={onDisplayCreate} />
}

const MessageListPanel = ({ onNavAction }: { onNavAction: () => void }) => {
    return (
        <Panel
            isRootPanel
            stackId={PanelStack.DIRECT_MESSAGES}
            label="Direct Messages"
            rightBarButton={<PanelHeaderButton icon="compose" onClick={onNavAction} />}
            padding="sm"
        >
            <GlobalContextUserLookupProvider>
                <DirectMessageList />
            </GlobalContextUserLookupProvider>
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
