import React, { useCallback, useState } from 'react'
import { TouchPanelNavigationBar } from '@components/TouchPanelNavigationBar/TouchPanelNavigationBar'
import { Box, BoxProps, Icon, IconButton, IconName, Stack, Text } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { CreateDirectMessage } from './CreateDIrectMessage'
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
        <Stack height="100%">
            {!hideNavigation && (
                <HybridPanelHeader label="Direct Messages" icon="compose" onAction={onNavAction} />
            )}
            <DirectMessageList />
        </Stack>
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
            {!hideNavigation && (
                <HybridPanelHeader label="New Message" icon="close" onClose={onNavAction} />
            )}
            <CreateDirectMessage onDirectMessageCreated={onNavAction} />
        </Stack>
    )
}

const HybridPanelHeader = (props: {
    label: string
    icon: IconName
    onClose?: () => void
    onAction?: () => void
}) => {
    const { isTouch } = useDevice()
    const { label, icon, onClose } = props
    return isTouch ? (
        <TouchPanelNavigationBar
            rightBarButton={
                props.onAction ? (
                    <PanelHeaderButton icon={icon} onClick={props.onAction} />
                ) : undefined
            }
            title={label}
            onBack={props.onClose}
        />
    ) : (
        <Box borderBottom>
            <Stack horizontal padding gap="lg" alignItems="center">
                <Text color="default" fontWeight="strong">
                    {props.label}
                </Text>
                <Stack grow />
                <PanelHeaderButton icon={props.icon} onClick={props.onClose} />
            </Stack>
        </Box>
    )
}

const PanelHeaderButton = ({ icon, ...boxProps }: { icon: IconName } & Omit<BoxProps, 'size'>) => {
    return <IconButton icon={icon} size="square_md" color="gray2" insetRight="xs" {...boxProps} />
}
