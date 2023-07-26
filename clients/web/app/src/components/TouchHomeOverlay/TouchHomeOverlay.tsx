import React, { useCallback, useState } from 'react'
import {
    createUserIdFromString,
    useMyProfile,
    useSpaceContext,
    useZionContext,
} from 'use-zion-client'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Avatar, Box, Icon, IconName, MotionBox, MotionStack, Stack, Text } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { SpaceNavItem } from '@components/NavItem/SpaceNavItem'
import { useCreateLink } from 'hooks/useCreateLink'
import { useAuth } from 'hooks/useAuth'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { SentryErrorReportForm } from '@components/SentryErrorReport/SentryErrorReport'
import { transitions } from 'ui/transitions/transitions'
import { NavItem } from '@components/NavItem/_NavItem'

type Props = {
    onClose: () => void
}

export const TouchHomeOverlay = (props: Props) => {
    const { onClose } = props
    const { logout } = useAuth()
    const user = useMyProfile()
    const userAddress = user ? createUserIdFromString(user.userId)?.accountAddress : undefined
    const { spaces } = useZionContext()
    const { spaceId } = useSpaceContext()

    const { createLink: createProfileLink } = useCreateLink()
    const link = createProfileLink({ profileId: 'me' })
    const navigate = useNavigate()

    const [isSentryModalVisible, setIsSentryModalVisible] = useState(false)
    const showSentryModal = useEvent(() => setIsSentryModalVisible(true))
    const hideSentryModal = useEvent(() => setIsSentryModalVisible(false))

    const onViewProfileClicked = useCallback(() => {
        if (link) {
            navigate(link)
        }
    }, [link, navigate])

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
                {user && (
                    <Stack
                        horizontal
                        paddingX="lg"
                        paddingTop="lg"
                        paddingBottom="sm"
                        alignItems="center"
                        gap="sm"
                    >
                        <Avatar
                            size="avatar_x4"
                            userId={user.userId}
                            onClick={onViewProfileClicked}
                        />
                        <Stack gap="sm" onClick={onViewProfileClicked}>
                            <Text>{user.displayName}</Text>
                            {userAddress && <Text color="gray2">{shortAddress(userAddress)}</Text>}
                        </Stack>

                        <Stack grow />
                        <Icon type="close" color="gray2" onClick={onClose} />
                    </Stack>
                )}
                <Box grow>
                    <Stack scroll paddingX="sm">
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
                    </Stack>
                </Box>
                <Stack borderTop padding="sm">
                    <BottomSectionButton
                        signout={false}
                        label="View profile"
                        icon="profile"
                        onClick={onViewProfileClicked}
                    />
                    <BottomSectionButton
                        signout={false}
                        label="Report a bug"
                        icon="help"
                        onClick={showSentryModal}
                    />
                    <BottomSectionButton signout label="Log out" icon="logout" onClick={logout} />
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
