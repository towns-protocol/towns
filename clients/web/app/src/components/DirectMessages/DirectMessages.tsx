import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { GlobalContextUserLookupProvider } from 'use-towns-client'
import { BoxProps, IconButton, IconName } from '@ui'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { useShortcut } from 'hooks/useShortcut'
import { useCreateLink } from 'hooks/useCreateLink'
import { Panel } from '@components/Panel/Panel'
import { DirectMessageList } from './DirectMessageList'

type DirectMessagesPanelProps = {
    hideNavigation?: boolean
}

export const DirectMessagesPanel = (props: DirectMessagesPanelProps) => {
    const { hideNavigation = false } = props

    const navigate = useNavigate()

    const { createLink } = useCreateLink()

    const onDisplayCreate = useCallback(() => {
        const link = createLink({ messageId: 'new' })
        if (link) {
            navigate(`${link}?ref=messages`)
        }
    }, [createLink, navigate])

    useShortcut('CreateMessage', onDisplayCreate)

    return <MessageListPanel hideNavigation={hideNavigation} onNavAction={onDisplayCreate} />
}

const MessageListPanel = ({
    onNavAction,
    hideNavigation,
}: {
    onNavAction: () => void
    hideNavigation: boolean
}) => {
    return (
        <ZLayerBox height="100%">
            <Panel
                label="Direct Messages"
                rightBarButton={<PanelHeaderButton icon="compose" onClick={onNavAction} />}
                padding="sm"
            >
                <GlobalContextUserLookupProvider>
                    <DirectMessageList />
                </GlobalContextUserLookupProvider>
            </Panel>
        </ZLayerBox>
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
