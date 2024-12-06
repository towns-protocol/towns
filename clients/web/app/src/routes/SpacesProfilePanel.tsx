import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { matchRoutes, useLocation, useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    Address,
    BlockchainTransactionType,
    Permission,
    SpaceData,
    useConnectivity,
    useGetRootKeyFromLinkedWallet,
    useHasPermission,
    useIsTransactionPending,
    useMyProfile,
    useSpaceData,
    useTownsClient,
    useTownsContext,
    useUserLookupContext,
    useWalletAddressIsBanned,
} from 'use-towns-client'
import { useBanTransaction, useUnbanTransaction } from 'use-towns-client/dist/hooks/use-banning'

import { useGetUserBio } from 'hooks/useUserBio'
import { Box, Button, Icon, Paragraph, Stack, Text } from '@ui'
import { UserProfile } from '@components/UserProfile/UserProfile'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { useStore } from 'store/store'
import { usePushNotifications } from 'hooks/usePushNotifications'
import { Panel } from '@components/Panel/Panel'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'workers/utils'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { ConfirmBanUnbanModal } from '@components/ConfirmBanUnbanModal/ConfirmBanUnbanModal'
import { ConfirmBlockModal } from '@components/ConfirmBlockModal/ConfirmBlockModal'
import { PanelButton } from '@components/Panel/PanelButton'
import { useBlockedUsers } from 'hooks/useBlockedUsers'
import { UserPreferences } from '@components/UserProfile/UserPreferences'
import { Analytics } from 'hooks/useAnalytics'
import { GetSigner } from 'privy/WalletReady'
import { TownNotificationsButton } from '@components/NotificationSettings/NotificationsSettingsButton'
import { useMatchingMessages } from '@components/DirectMessages/CreateDirectMessage/hooks/useMatchingMessages'
import { TownsWallet } from '@components/Web3/Wallet/TownsWallet'
import { usePanelActions } from './layouts/hooks/usePanelActions'

export const SpaceProfilePanel = () => {
    return (
        <Panel label="Profile">
            <SpaceProfile />
        </Panel>
    )
}

export const SpaceProfile = React.memo(() => <SpaceProfileWithoutAuth />)

enum ModalType {
    Wallets = 'wallets',
    Preferences = 'preferences',
}

const SpaceProfileWithoutAuth = () => {
    const { client } = useTownsClient()
    const isAccountAbstractionEnabled = client?.isAccountAbstractionEnabled()
    const [search] = useSearchParams()
    const space = useSpaceData()

    const cameFromSpaceInfoPanel = search.get('spaceInfo') !== null
    const [searchParams] = useSearchParams()
    const profileIdFromPath = searchParams.get('profileId') || 'me'
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

    const [modal, setModal] = useState<ModalType | undefined>(undefined)

    const { requestPushPermission, simplifiedPermissionState } = usePushNotifications()

    const navigate = useNavigate()

    const onBack = useEvent(() => {
        navigate(-1)
    })

    const { logout } = useCombinedAuth()
    const { loggedInWalletAddress } = useConnectivity()

    const onLogoutClick = useEvent(() => {
        const analytics = Analytics.getInstance()
        analytics.track('clicked logout', {}, () => {
            console.log('[analytics] clicked logout')
        })
        analytics.reset()
        logout()
    })

    const { createLink } = useCreateLink()

    const onMessageClick = useCallback(async () => {
        if (!userId) {
            return
        }
        const link = createLink({ messageId: 'new' })
        if (link) {
            navigate(`${link}?to=${userId}`)
        }
    }, [createLink, navigate, userId])

    const myUser = useMyProfile()

    const { lookupUser } = useUserLookupContext()
    const location = useLocation()
    const isMeRoute = matchRoutes([{ path: '/me' }], location) || profileIdFromPath === 'me'

    const { openPanel } = usePanelActions()

    const onWalletLinkingClick = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.WALLETS)
    })

    const onIdentityClick = useEvent(() => {
        openPanel(CHANNEL_INFO_PARAMS.IDENTITY)
    })

    const onPreferencesClick = useEvent(() => {
        if (isTouch) {
            setModal(ModalType.Preferences)
        } else {
            openPanel(CHANNEL_INFO_PARAMS.PREFERENCES)
        }
    })

    const user = useMemo(() => {
        if (isMeRoute) {
            return {
                ...myUser,
                userId: myUser?.userId ?? '',
                displayName: myUser?.displayName ?? '',
            }
        }
        if (userId) {
            return lookupUser(userId)
        }
    }, [isMeRoute, userId, myUser, lookupUser])

    const isValid = !!user

    const { data: userAbstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: user?.userId as Address | undefined,
    })

    const { data: loggedInAbstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const { isBanned, isLoading: isLoadingBanStatus } = useWalletAddressIsBanned(
        space?.id,
        user?.userId,
    )

    const { hasPermission: canBan } = useHasPermission({
        spaceId: space?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifyBanning,
    })

    const { data: userBio } = useGetUserBio(user?.userId)

    const canEdit = !!client && loggedInAbstractAccountAddress === userAbstractAccountAddress

    const toggleTheme = useStore(({ toggleTheme }) => toggleTheme)

    const isCurrentUser = user?.userId === myUser?.userId

    const { isTouch } = useDevice()

    const isUserBlocked = useBlockedUsers()
    const isBlocked: boolean = isUserBlocked(userId)

    useEffect(() => {
        if (
            isCurrentUser &&
            (simplifiedPermissionState === 'soft-denied' ||
                simplifiedPermissionState === 'hard-denied')
        ) {
            Analytics.getInstance().page(
                'toast',
                'toast shown to enable notifications',
                {
                    spaceId: space?.id ?? 'undefined',
                },
                () => {
                    console.log('[analytics] toast shown to enable notifications', {
                        spaceId: space?.id ?? 'undefined',
                    })
                },
            )
        }
    }, [isCurrentUser, simplifiedPermissionState, space?.id])

    const { dmChannels } = useTownsContext()
    const { matchingDM } = useMatchingMessages({
        selectedUserArray: [userId ?? ''],
        dmChannels,
    })

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
                <Stack gap paddingBottom="md" paddingTop="none">
                    <TownsWallet />
                    {/* wallets */}
                    <PanelButton onClick={onWalletLinkingClick}>
                        <Box width="height_md" alignItems="center">
                            <Icon type="wallet" size="square_sm" />
                        </Box>
                        <Paragraph>Linked Wallets</Paragraph>
                    </PanelButton>

                    <PanelButton onClick={onIdentityClick}>
                        <Box width="height_md" alignItems="center">
                            <Icon type="link" size="square_sm" />
                        </Box>
                        <Paragraph>Linked Accounts</Paragraph>
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

                    <PanelButton onClick={onPreferencesClick}>
                        <Box width="height_md" alignItems="center">
                            <Icon type="settings" size="square_sm" />
                        </Box>
                        <Paragraph color="default">Preferences</Paragraph>
                    </PanelButton>

                    <PanelButton onClick={toggleTheme}>
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

                    <PanelButton
                        tone="negative"
                        data-testid="logout-button"
                        onClick={onLogoutClick}
                    >
                        <Box width="height_md" alignItems="center">
                            <Icon type="logout" size="square_sm" />
                        </Box>
                        <Paragraph>Logout</Paragraph>
                    </PanelButton>
                </Stack>
            )}

            {modal === ModalType.Wallets && (
                <ModalContainer touchTitle="Wallets" onHide={() => setModal(undefined)}>
                    <WalletLinkingPanel />
                </ModalContainer>
            )}

            {modal === ModalType.Preferences && (
                <ModalContainer touchTitle="Preferences" onHide={() => setModal(undefined)}>
                    <Box padding gap>
                        <UserPreferences />
                    </Box>
                </ModalContainer>
            )}

            <Stack gap>
                {!isCurrentUser && !search.has('message') && user && (
                    <PanelButton onClick={onMessageClick}>
                        <Icon type="message" size="square_sm" color="gray2" />
                        <Paragraph color="default">Send Message</Paragraph>
                    </PanelButton>
                )}
                {!isCurrentUser && matchingDM && (
                    <TownNotificationsButton type="dm" channelId={matchingDM.id} />
                )}

                {!isCurrentUser &&
                    canBan &&
                    space &&
                    !isLoadingBanStatus &&
                    userAbstractAccountAddress && (
                        <BanPanelButton
                            walletAddress={user?.userId ?? ''}
                            isBanned={isBanned}
                            space={space}
                        />
                    )}
                {!isCurrentUser && userId && (
                    <BlockPanelButton userId={userId} isBlocked={isBlocked} />
                )}
            </Stack>
        </Stack>
    )
}

const BanPanelButton = (props: { walletAddress: string; space: SpaceData; isBanned: boolean }) => {
    const { walletAddress, space, isBanned } = props
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false)
    const { banTransaction } = useBanTransaction()
    const { unbanTransaction } = useUnbanTransaction()

    const onClick = useCallback(() => {
        setIsConfirmModalVisible(true)
    }, [setIsConfirmModalVisible])

    const onCancelClick = useCallback(() => {
        setIsConfirmModalVisible(false)
    }, [setIsConfirmModalVisible])

    const onConfirmClick = useCallback(
        (getSigner: GetSigner) => {
            setIsConfirmModalVisible(false)
            if (!space?.id) {
                return
            }
            async function performTransaction(spaceId: string, userId: string) {
                const signer = await getSigner()
                if (!signer) {
                    createPrivyNotAuthenticatedNotification()
                    return
                }
                if (isBanned) {
                    unbanTransaction(signer, spaceId, userId)
                } else {
                    banTransaction(signer, spaceId, userId)
                }
            }
            void performTransaction(space.id, walletAddress)
        },
        [
            space?.id,
            walletAddress,
            banTransaction,
            unbanTransaction,
            isBanned,
            setIsConfirmModalVisible,
        ],
    )

    const isBanTransactionPending = useIsTransactionPending(BlockchainTransactionType.BanUser)
    const isUnbanTransactionPending = useIsTransactionPending(BlockchainTransactionType.UnbanUser)
    const isTransactionPending = isBanTransactionPending || isUnbanTransactionPending

    return (
        <>
            <PanelButton tone="negative" onClick={onClick}>
                <Icon type={isBanned ? 'unban' : 'ban'} size="square_sm" />
                {isTransactionPending ? (
                    <Box grow>
                        <ButtonSpinner />
                    </Box>
                ) : (
                    <Paragraph>
                        {isBanned ? 'Unban' : 'Ban'} from {space.name}
                    </Paragraph>
                )}
            </PanelButton>
            {isConfirmModalVisible === true && (
                <ConfirmBanUnbanModal
                    userId={walletAddress}
                    ban={!isBanned}
                    onConfirm={onConfirmClick}
                    onCancel={onCancelClick}
                />
            )}
        </>
    )
}

const BlockPanelButton = (props: { userId: string; isBlocked: boolean }) => {
    const { userId, isBlocked: isCurrentlyBlocked } = props
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false)
    const [isUserBlockRequestInFlight, setIsUserBlockRequestInFlight] = useState(false)
    const { updateUserBlock } = useTownsClient()

    const onClick = useCallback(async () => {
        if (isUserBlockRequestInFlight) {
            return
        }
        if (isCurrentlyBlocked) {
            setIsUserBlockRequestInFlight(true)
            // unblock user
            await updateUserBlock(userId, false)
            setIsUserBlockRequestInFlight(false)
        } else {
            setIsConfirmModalVisible(true)
        }
    }, [isCurrentlyBlocked, isUserBlockRequestInFlight, updateUserBlock, userId])

    const onCancelClick = useCallback(() => {
        setIsConfirmModalVisible(false)
    }, [setIsConfirmModalVisible])

    const onConfirmClick = useCallback(async () => {
        setIsConfirmModalVisible(false)
        setIsUserBlockRequestInFlight(true)
        // block user
        await updateUserBlock(userId, true)
        setIsUserBlockRequestInFlight(false)
    }, [updateUserBlock, userId])

    return (
        <>
            <PanelButton tone="negative" onClick={onClick}>
                <Icon type={isCurrentlyBlocked ? 'unblockHand' : 'blockHand'} size="square_sm" />
                <Paragraph>{isCurrentlyBlocked ? 'Unblock' : 'Block'}</Paragraph>
            </PanelButton>
            {isConfirmModalVisible === true && (
                <ConfirmBlockModal
                    userId={userId}
                    onConfirm={onConfirmClick}
                    onCancel={onCancelClick}
                />
            )}
        </>
    )
}
