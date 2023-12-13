import React, { useCallback, useMemo, useState } from 'react'
import { matchRoutes, useLocation, useNavigate, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    getAccountAddress,
    useAllKnownUsers,
    useMyProfile,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { useGetUserBio } from 'hooks/useUserBio'
import { Box, Button, Icon, Paragraph, Stack, Text } from '@ui'
import { UserProfile } from '@components/UserProfile/UserProfile'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAuth } from 'hooks/useAuth'
import { useStore } from 'store/store'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { Panel, PanelButton } from '@components/Panel/Panel'
import { NESTED_PROFILE_PANEL_PATHS } from 'routes'
import { useCreateLink } from 'hooks/useCreateLink'
import { isTouch } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'

export const SpaceProfilePanel = (props: { children?: React.ReactNode }) => {
    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('../')
    })

    return (
        <Panel label="Profile" onClose={onClose}>
            <SpaceProfile {...props} />
        </Panel>
    )
}

export const SpaceProfile = (props: { children?: React.ReactNode }) => {
    const [search] = useSearchParams()
    const cameFromSpaceInfoPanel = search.get('spaceInfo') !== null
    const { profileId = 'me' } = useParams()
    const { createDMChannel } = useZionClient()
    const [modal, setModal] = useState<'wallets' | undefined>(undefined)

    const { requestPushPermission, simplifiedPermissionState } = usePushNotifications()

    const navigate = useNavigate()

    const onBack = useEvent(() => {
        navigate(-1)
    })

    const { logout } = useAuth()

    const onLogoutClick = useEvent(() => {
        logout()
    })

    const { createLink } = useCreateLink()

    const onMessageClick = useCallback(async () => {
        const streamId = await createDMChannel(profileId)
        const link = streamId && createLink({ messageId: streamId.networkId })
        if (link) {
            navigate(link + '?ref=profile')
        }
    }, [createDMChannel, createLink, navigate, profileId])

    const profileUser = useMyProfile()
    const { membersMap } = useSpaceMembers()
    const { usersMap } = useAllKnownUsers()
    const location = useLocation()
    const isMeRoute = matchRoutes([{ path: '/me' }], location) || profileId === 'me'

    const onWalletLinkingClick = useEvent(() => {
        if (isTouch()) {
            setModal('wallets')
        } else {
            navigate(`${location.pathname}/${NESTED_PROFILE_PANEL_PATHS.WALLETS}`, {
                state: {
                    from: location.pathname,
                },
            })
        }
    })

    const user = useMemo(
        () =>
            isMeRoute
                ? {
                      ...profileUser,
                      userId: profileUser?.userId ?? '',
                      displayName: profileUser?.displayName ?? '',
                  }
                : profileId
                ? membersMap[profileId] ?? usersMap[profileId]
                : undefined,
        [isMeRoute, membersMap, profileId, profileUser, usersMap],
    )

    const isValid = !!user

    const userAddress = isValid ? getAccountAddress(user.userId) : undefined
    const { data: userBio } = useGetUserBio(userAddress)

    const loggedInUserId = useMyProfile()?.userId
    const loggedInUserAddress = loggedInUserId ? getAccountAddress(loggedInUserId) : undefined

    const canEdit = loggedInUserAddress === userAddress

    const { setTheme, theme } = useStore((state) => ({
        theme: state.theme,
        setTheme: state.setTheme,
    }))

    const onThemeClick = () => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }
    const isCurrentUser = user?.userId === profileUser?.userId

    return (
        <Stack gap>
            {isValid ? (
                <UserProfile
                    center
                    key={user.userId}
                    userId={user.userId}
                    displayName={getPrettyDisplayName(user).displayName}
                    userAddress={userAddress}
                    userBio={userBio}
                    canEdit={canEdit}
                />
            ) : (
                <Stack padding>
                    <Paragraph>Profile not found</Paragraph>
                </Stack>
            )}

            {cameFromSpaceInfoPanel && (
                <Box centerContent>
                    <Button
                        width="auto"
                        tone="none"
                        size="button_sm"
                        style={{
                            boxShadow: 'none',
                        }}
                        onClick={onBack}
                    >
                        <Text color="cta1">Back to space info</Text>
                    </Button>
                </Box>
            )}
            {isCurrentUser && (
                <Stack gap paddingX paddingBottom="lg" paddingTop="none">
                    {/* wallets */}
                    <PanelButton onClick={onWalletLinkingClick}>
                        <Box width="height_md" alignItems="center">
                            <Icon type="wallet" size="square_sm" />
                        </Box>
                        <Paragraph>Wallets</Paragraph>
                    </PanelButton>

                    {simplifiedPermissionState === 'soft-denied' && (
                        <>
                            <PanelButton onClick={requestPushPermission}>
                                <Box width="height_md" alignItems="center">
                                    <Icon type="bell" size="square_sm" />
                                </Box>
                                <Paragraph>Enable push notifications</Paragraph>
                            </PanelButton>
                        </>
                    )}

                    {simplifiedPermissionState === 'hard-denied' && (
                        <PanelButton height="auto" onClick={requestPushPermission}>
                            <Stack horizontal gap="sm" alignItems="center">
                                <Box width="height_md" alignItems="center">
                                    <Icon type="bell" size="square_sm" />
                                </Box>
                                <Stack>
                                    <Paragraph fontWeight="strong" size="md">
                                        Enable Push Notifications
                                    </Paragraph>

                                    <Paragraph size="md">
                                        Look for the padlock or <strong>Secure</strong> sign in the
                                        address bar.
                                        <br />
                                        Click on it, and a menu will appear.
                                        <br />
                                        Find <strong>Notifications</strong> and choose{' '}
                                        <strong>Enable</strong>
                                    </Paragraph>
                                </Stack>
                            </Stack>
                        </PanelButton>
                    )}
                    <PanelButton onClick={onThemeClick}>
                        <Box
                            border
                            centerContent
                            rounded="sm"
                            aspectRatio="1/1"
                            height="height_md"
                            background="inverted"
                            alignItems="center"
                        >
                            Aa
                        </Box>
                        <Paragraph color="default">Switch theme</Paragraph>
                    </PanelButton>

                    <PanelButton tone="negative" onClick={onLogoutClick}>
                        <Box width="height_md" alignItems="center">
                            <Icon type="logout" size="square_sm" />
                        </Box>
                        <Paragraph>Logout</Paragraph>
                    </PanelButton>
                </Stack>
            )}

            {modal === 'wallets' && (
                <ModalContainer touchTitle="Wallets" onHide={() => setModal(undefined)}>
                    <WalletLinkingPanel />
                </ModalContainer>
            )}

            {!isCurrentUser && !search.has('message') && (
                <Stack padding gap>
                    <PanelButton onClick={onMessageClick}>
                        <Icon type="message" size="square_sm" color="gray2" />
                        <Paragraph color="default">Send Message</Paragraph>
                    </PanelButton>
                </Stack>
            )}
        </Stack>
    )
}
