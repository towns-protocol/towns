import React, { useCallback, useState } from 'react'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { Box, BoxProps, Icon, IconButton, IconName, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { CreateDirectMessage } from './CreateDirectMessage'
import { DirectMessageList } from './DirectMessageList'

type DirectMessagesPanelProps = {
    hideNavigation?: boolean
}

export const DirectMessagesModal = (props: { onHide: () => void }) => {
    return (
        <ModalContainer
            touchTitle="Direct Messages"
            rightBarButton={<Icon type="compose" color="gray2" />}
            onHide={props.onHide}
        >
            <DirectMessagesPanel hideNavigation />
        </ModalContainer>
    )
}

export const DirectMessagesPanel = (props: DirectMessagesPanelProps) => {
    const { hideNavigation = false } = props
    const [panelMode, setPanelMode] = useState<'list' | 'create'>('list')

    const onDisplayList = useCallback(() => {
        setPanelMode('list')
    }, [])

    const onDisplayCreate = useCallback(() => {
        setPanelMode('create')
    }, [])

    return panelMode === 'list' ? (
        <MessageListPanel hideNavigation={hideNavigation} onNavAction={onDisplayCreate} />
    ) : (
        <NewMessagePanel hideNavigation={hideNavigation} onNavAction={onDisplayList} />
    )
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
            <DirectMessageList />
        </ZLayerBox>
    )
}

const NewMessagePanel = ({
    onNavAction,
    hideNavigation,
}: {
    onNavAction: () => void
    hideNavigation: boolean
}) => {
    return (
        <Stack height="100%">
            {!hideNavigation && <PanelHeader label="New Message" onClose={onNavAction} />}
            <CreateDirectMessage onDirectMessageCreated={onNavAction} />
        </Stack>
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
        <Box borderBottom>
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
