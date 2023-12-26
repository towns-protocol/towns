import React, { useCallback, useState } from 'react'
import { useSpaceContext, useZionContext } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'
import { useAuth } from 'hooks/useAuth'
import { shortAddress } from 'ui/utils/utils'
import { Box, IconButton, MotionBox, MotionStack, Stack, Text } from '@ui'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { ErrorReportForm } from '@components/ErrorReport/ErrorReport'
import { transitions } from 'ui/transitions/transitions'
import { NavItem } from '@components/NavItem/_NavItem'
import { PATHS } from 'routes'

type Props = {
    onClose: () => void
}

export const TouchHomeOverlay = (props: Props) => {
    const { onClose } = props

    const { loggedInWalletAddress } = useAuth()
    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()
    const navigate = useNavigate()
    const [isErrorReportModalVisible, setErrorReportModalVisible] = useState(false)
    const showErrorReportModal = useEvent(() => setErrorReportModalVisible(true))
    const hideErrorReportModal = useEvent(() => setErrorReportModalVisible(false))

    const profileClicked = useCallback(() => {
        const path = `/${PATHS.SPACES}/${spaceId}/${PATHS.PROFILE}/me`
        navigate(path)
    }, [navigate, spaceId])

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

                <Stack horizontal padding="md" paddingRight="sm" alignItems="center">
                    <Stack gap="sm" onClick={profileClicked}>
                        <Text fontSize="lg" fontWeight="strong">
                            My Towns
                        </Text>
                        {loggedInWalletAddress && (
                            <Text fontSize="sm" color="gray2">
                                River Protocol user {shortAddress(loggedInWalletAddress)}
                            </Text>
                        )}
                    </Stack>
                    <Box grow />
                    <IconButton icon="close" onClick={onClose} />
                </Stack>
                <Box grow scroll>
                    <Box minHeight="forceScroll">
                        {spaces.map((s) => (
                            <SpaceNavItem
                                key={s.id}
                                exact={false}
                                forceMatch={s.id === spaceId}
                                id={s.id}
                                name={s.name}
                                avatar={s.avatarSrc}
                                pinned={false}
                                onClick={onClose}
                            />
                        ))}
                    </Box>
                </Box>

                <Stack paddingX="sm" paddingTop="md">
                    <Box paddingX="sm">
                        <Text textAlign="left" color="gray2" fontSize="sm">
                            Towns {APP_VERSION} ({APP_COMMIT_HASH})
                        </Text>
                    </Box>
                    <NavItem padding="none" onClick={showErrorReportModal}>
                        <Text textAlign="left" color="gray1" fontSize="sm">
                            Send us Feedback
                        </Text>
                    </NavItem>
                </Stack>

                {isErrorReportModalVisible && (
                    <ModalContainer touchTitle="Report a bug" onHide={hideErrorReportModal}>
                        <ErrorReportForm onHide={hideErrorReportModal} />
                    </ModalContainer>
                )}
            </MotionStack>
        </Box>
    )
}
