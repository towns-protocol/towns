import React, { useState } from 'react'
import { useSpaceContext, useZionContext } from 'use-zion-client'

import { useEvent } from 'react-use-event-hook'
import { Box, Icon, IconButton, IconName, MotionBox, MotionStack, Stack, Text } from '@ui'

import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { SentryErrorReportForm } from '@components/SentryErrorReport/SentryErrorReport'
import { transitions } from 'ui/transitions/transitions'
import { NavItem } from '@components/NavItem/_NavItem'

type Props = {
    onClose: () => void
}

export const TouchHomeOverlay = (props: Props) => {
    const { onClose } = props

    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()

    const [isSentryModalVisible, setIsSentryModalVisible] = useState(false)
    const showSentryModal = useEvent(() => setIsSentryModalVisible(true))
    const hideSentryModal = useEvent(() => setIsSentryModalVisible(false))

    return (
        <Box absoluteFill height="100dvh">
            <MotionBox
                absoluteFill
                initial={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                background="level1"
                height="100dvh"
                onClick={onClose}
            />
            <MotionStack
                borderRight
                gap="xs"
                paddingY="md"
                initial={{ x: '-75%', opacity: 0 }}
                exit={{ x: '-75%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={transitions.panel}
                width="75%"
                height="100dvh"
                background="level1"
                paddingTop="safeAreaInsetTop"
                paddingBottom="safeAreaInsetBottom"
            >
                <Box
                    background="level1"
                    style={{ position: 'absolute', left: -100, top: 0, bottom: 0, width: 100 }}
                />

                <Box grow>
                    <Stack horizontal padding="md" paddingRight="sm" alignItems="center">
                        <Text fontSize="lg" fontWeight="strong">
                            Towns
                        </Text>
                        <Box grow />
                        <IconButton icon="close" onClick={onClose} />
                    </Stack>
                    <Box grow scroll>
                        <Box minHeight="forceScroll">
                            {spaces.map((s) => (
                                <SpaceNavItem
                                    key={s.id.slug}
                                    exact={false}
                                    forceMatch={s.id.networkId === spaceId?.networkId}
                                    id={s.id}
                                    name={s.name}
                                    avatar={s.avatarSrc}
                                    pinned={false}
                                    onClick={onClose}
                                />
                            ))}
                        </Box>
                    </Box>
                </Box>

                <Stack borderTop padding="sm">
                    <BottomSectionButton
                        signout={false}
                        label="Report a bug"
                        icon="help"
                        onClick={showSentryModal}
                    />
                    <Box paddingTop="md" paddingBottom="lg">
                        <Text textAlign="center" color="gray2" fontSize="sm">
                            Towns {APP_VERSION} ({APP_COMMIT_HASH})
                        </Text>
                    </Box>
                </Stack>

                {isSentryModalVisible && (
                    <ModalContainer touchTitle="Report a bug" onHide={hideSentryModal}>
                        <SentryErrorReportForm onHide={hideSentryModal} />
                    </ModalContainer>
                )}
            </MotionStack>
        </Box>
    )
}

const BottomSectionButton = (props: {
    onClick: () => void
    label: string
    icon: IconName
    signout: boolean
}) => {
    return (
        <NavItem id={props.label} onClick={props.onClick}>
            <Box padding="sm" background="level2" rounded="sm">
                <Icon
                    color={props.signout ? 'error' : 'gray2'}
                    type={props.icon}
                    size="square_xs"
                />
            </Box>
            <Text color={props.signout ? 'error' : 'default'}>{props.label}</Text>
        </NavItem>
    )
}
