import React, { useCallback, useMemo, useState } from 'react'
import { matchRoutes, useLocation, useNavigate, useParams } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    Address,
    LookupUser,
    useGetRootKeyFromLinkedWallet,
    useMyProfile,
    useUserLookupContext,
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
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'workers/utils'

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
    const { client } = useZionClient()
    const isAccountAbstractionEnabled = client?.isAccountAbstractionEnabled()
    const [search] = useSearchParams()
    const cameFromSpaceInfoPanel = search.get('spaceInfo') !== null
    const { profileId: profileIdFromPath = 'me' } = useParams()
    const { data: rootKeyAddress, isLoading: isLoadingRootKey } = useGetRootKeyFromLinkedWallet({
        walletAddress: profileIdFromPath,
    })
    // when account abstraction is off (Developing against anvil), we can use the profileIdFromPath directly
    // the profileIdFromPath is the userId
    // when account abstraction is on, profileIdFromPath is the abstract account address
    // so we need to use the derived rootKeyAddress to get the userId
    const userId = useMemo(() => {
        if (!isAccountAbstractionEnabled) {
            return profileIdFromPath
        }
        return profileIdFromPath === 'me' ? profileIdFromPath : rootKeyAddress
    }, [isAccountAbstractionEnabled, profileIdFromPath, rootKeyAddress])

    const { createDMChannel } = useZionClient()
    const [modal, setModal] = useState<'wallets' | undefined>(undefined)

    const { requestPushPermission, simplifiedPermissionState } = usePushNotifications()

    const navigate = useNavigate()

    const onBack = useEvent(() => {
        navigate(-1)
    })

    const { logout, loggedInWalletAddress } = useAuth()

    const onLogoutClick = useEvent(() => {
        logout()
    })

    const { createLink } = useCreateLink()

    const onMessageClick = useCallback(async () => {
        if (!userId) {
            return
        }
        const streamId = await createDMChannel(userId)
        const link = streamId && createLink({ messageId: streamId })
        if (link) {
            navigate(link + '?ref=profile')
        }
    }, [createDMChannel, createLink, navigate, userId])

    const myUser = useMyProfile()

    const { usersMap } = useUserLookupContext()
    const location = useLocation()
    const isMeRoute = matchRoutes([{ path: '/me' }], location) || profileIdFromPath === 'me'

    const onWalletLinkingClick = useEvent(() => {
        if (isTouch) {
            setModal('wallets')
        } else {
            navigate(`${location.pathname}/${NESTED_PROFILE_PANEL_PATHS.WALLETS}`, {
                state: {
                    from: location.pathname,
                },
            })
        }
    })

    const user: LookupUser | undefined = useMemo(() => {
        if (isMeRoute) {
            return {
                ...myUser,
                userId: myUser?.userId ?? '',
                displayName: myUser?.displayName ?? '',
            }
        }
        if (userId) {
            return usersMap[userId]
        }
    }, [isMeRoute, userId, myUser, usersMap])

    const isValid = !!user

    const { data: userAbstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: user?.userId as Address | undefined,
    })

    const { data: loggedInAbstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { data: userBio } = useGetUserBio(userAbstractAccountAddress)

    const canEdit = loggedInAbstractAccountAddress === userAbstractAccountAddress

    const { setTheme, theme } = useStore((state) => ({
        theme: state.theme,
        setTheme: state.setTheme,
    }))

    const onThemeClick = () => {
        setTheme(theme === 'light' ? 'dark' : 'light')
    }

    const isCurrentUser = user?.userId === myUser?.userId

    const { isTouch } = useDevice()

    if (isLoadingRootKey) {
        return (
            <Stack centerContent grow>
                <ButtonSpinner />
            </Stack>
        )
    }

    return (
        <Stack gap>
            {isValid ? (
                <UserProfile
                    center
                    key={user.userId}
                    userId={user.userId}
                    abstractAccountAddress={userAbstractAccountAddress}
                    displayName={getPrettyDisplayName(user)}
                    userBio={userBio}
                    canEdit={canEdit}
                />
            ) : (
                <Stack padding>
                    <Box padding border="negative" rounded="xs">
                        <Paragraph color="error">Profile not found</Paragraph>
                        <Paragraph color="gray2" size="xs">
                            {profileIdFromPath && (
                                <>
                                    <ClipboardCopy
                                        label={shortAddress(profileIdFromPath)}
                                        clipboardContent={profileIdFromPath}
                                        fontSize="sm"
                                    />
                                    {userId && (
                                        <ClipboardCopy
                                            label={`resolved: ${shortAddress(userId)}`}
                                            clipboardContent={userId}
                                            fontSize="sm"
                                        />
                                    )}
                                </>
                            )}
                        </Paragraph>
                    </Box>
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

            {!isCurrentUser && !search.has('message') && user && (
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
