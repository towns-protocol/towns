import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { GlobalContextUserLookupProvider } from 'use-zion-client'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { Box, BoxProps, IconButton, IconName, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { useShortcut } from 'hooks/useShortcut'
import { useCreateLink } from 'hooks/useCreateLink'
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
            {!hideNavigation && (
                <PanelHeader label="Direct Messages" actionIcon="compose" onAction={onNavAction} />
            )}
            <GlobalContextUserLookupProvider>
                <DirectMessageList />
            </GlobalContextUserLookupProvider>
        </ZLayerBox>
    )
}

const PanelHeader = (props: {
    label: string
    actionIcon?: IconName
    onClose?: () => void
    onAction?: () => void
}) => {
    const { isTouch } = useDevice()
    const { label, actionIcon, onClose, onAction } = props
    return isTouch ? (
        <TouchPanelNavigationBar
            rightBarButton={
                actionIcon && props.onAction ? (
                    <PanelHeaderButton icon={actionIcon} onClick={onAction} />
                ) : undefined
            }
            title={label}
            onBack={onClose}
        />
    ) : (
        <Box borderBottom height="x8">
            <Stack horizontal padding gap="lg" alignItems="center">
                <Text color="default" fontWeight="strong">
                    {label}
                </Text>
                <Stack grow />
                {actionIcon && onAction && (
                    <PanelHeaderButton icon={actionIcon} onClick={onAction} />
                )}
                {onClose && <PanelHeaderButton icon="close" onClick={onClose} />}
            </Stack>
        </Box>
    )
}

const PanelHeaderButton = ({ icon, ...boxProps }: { icon: IconName } & Omit<BoxProps, 'size'>) => {
    return <IconButton icon={icon} size="square_md" color="gray2" insetRight="xs" {...boxProps} />
}
