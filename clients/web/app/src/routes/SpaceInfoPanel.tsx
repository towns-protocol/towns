import { Address, Permission } from '@river-build/web3'
import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    LookupUser,
    useBannedWalletAddresses,
    useConnectivity,
    useContractSpaceInfo,
    useGetRootKeyFromLinkedWallet,
    useHasPermission,
    useIsSpaceOwner,
    useSpaceData,
    useSpaceId,
    useSpaceMembers,
    useTownsClient,
    useTownsContext,
    useUser,
} from 'use-towns-client'
import { isValidStreamId } from '@river-build/sdk'
import { BigNumberish } from 'ethers'
import { isAddress } from '@components/Web3/Wallet/useGetWalletParam'
import { UploadImageRequestConfig } from '@components/UploadImage/useOnImageChangeEvent'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { PanelButton } from '@components/Panel/PanelButton'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { TownInfoModal } from '@components/TownInfoModal/TownInfoModal'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { Box, FormRender, Icon, IconButton, Paragraph, Stack, Text, TextButton } from '@ui'
import {
    toggleMuteSetting,
    useMuteSettings,
    useSetMuteSettingForChannelOrSpace,
} from 'api/lib/notificationSettings'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { CHANNEL_INFO_PARAMS, TOWN_INFO_PARAMS } from 'routes'
import { getInviteUrl, shortAddress } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ConfirmLeaveModal } from '@components/ConfirmLeaveModal/ConfirmLeaveModal'
import { Avatar } from '@components/Avatar/Avatar'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
import { RolesPanel } from '@components/SpaceSettingsPanel/RolesPanel'
import { openSeaAssetUrl } from '@components/Web3/utils'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Panel } from '@components/Panel/Panel'
import { SpaceSettingsNavigationPanel } from '@components/SpaceSettingsPanel/SpaceSettingsNavigationPanel'
import { useAppProgressStore } from '@components/AppProgressOverlay/store/appProgressStore'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useUploadAttachment } from '@components/MediaDropContext/useUploadAttachment'
import { EditTownInfo } from '@components/Panel/EditTownInfo'
import { ContractInfoButtons } from '@components/Panel/ContractInfoButtons'
import { Analytics } from 'hooks/useAnalytics'
import { popupToast } from '@components/Notifications/popupToast'

import { useBalance } from 'hooks/useBalance'
import { useWaitForInvalidation } from 'hooks/useWaitForInvalidation'
import { useRefreshSpaceMember } from 'hooks/useRefreshSpaceMember'
import { useEntitlements } from 'hooks/useEntitlements'
import { EntitlementsDisplay } from '@components/TownPageLayout/EntitlementsDisplay'
import { PublicTownPageForAuthenticatedUser } from './PublicTownPage/PublicTownPage'
import { usePanelActions } from './layouts/hooks/usePanelActions'

export const SpaceInfoPanel = () => {
    return (
        <Panel label="Town Info">
            <SpaceInfo />
        </Panel>
    )
}

export const SpaceInfo = () => {
    const space = useSpaceData()
    const { isTouch } = useDevice()
    const [searchParams] = useSearchParams()

    // touch handles roles panel with modals
    const isRolesPanel = !isTouch && searchParams.get(CHANNEL_INFO_PARAMS.ROLES) != null
    const isSpaceSettingsPanel =
        !isTouch && searchParams.get(CHANNEL_INFO_PARAMS.SPACE_SETTINGS_NAVIGATION) != null
    const isBannedUsersPanel = !isTouch && searchParams.get(CHANNEL_INFO_PARAMS.BANNED) != null
    const { leaveRoom } = useTownsClient()
    const { casablancaClient } = useTownsContext()
    const channels = useSpaceChannels()
    const { loggedInWalletAddress } = useConnectivity()

    const { data: contractSpaceInfo } = useContractSpaceInfo(space?.id)
    const owner = contractSpaceInfo?.owner
    const address = contractSpaceInfo?.address ?? ''
    const shortDescription = contractSpaceInfo?.shortDescription ?? ''
    const longDescription = contractSpaceInfo?.longDescription ?? ''
    const navigate = useNavigate()
    const { hasPermission: canEdit } = useHasPermission({
        spaceId: space?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })

    const { isOwner } = useIsSpaceOwner(space?.id, loggedInWalletAddress)

    const { hasPermission: canBan } = useHasPermission({
        spaceId: space?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifyBanning,
    })

    const { removeTownNotificationSettings } = useNotificationSettings()

    const { memberIds } = useSpaceMembers()
    const [activeModal, setActiveModal] = useState<
        | 'browse-channels'
        | 'members'
        | 'confirm-leave'
        | 'preview'
        | 'wallets'
        | 'edit-membership'
        | (typeof CHANNEL_INFO_PARAMS)[keyof typeof CHANNEL_INFO_PARAMS]
        | (typeof TOWN_INFO_PARAMS)[keyof typeof TOWN_INFO_PARAMS]
        | undefined
    >(undefined)

    const { openPanel } = usePanelActions()

    const onShowBrowseChannels = useEvent(() => {
        if (isTouch) {
            setActiveModal(CHANNEL_INFO_PARAMS.BROWSE_CHANNELS)
        } else {
            openPanel(CHANNEL_INFO_PARAMS.BROWSE_CHANNELS)
        }
    })

    const onShowTownPreview = useEvent(() => setActiveModal('preview'))

    const shareButtonEnabled = isTouch && navigator.share
    const onSharePressed = useEvent(async () => {
        if (!space) {
            return
        }
        const url = getInviteUrl({ spaceId: space.id })
        try {
            await navigator.share({ title: space.name, url: url, text: url })
        } catch (_) {} // eslint-disable-line no-empty
    })

    const spaceID = useSpaceId()
    const { spaceIsMuted, spaceMuteSetting } = useMuteSettings({
        spaceId: spaceID,
    })
    const { mutate: mutateNotificationSettings, isPending: isSettingNotification } =
        useSetMuteSettingForChannelOrSpace()

    const onToggleSpaceMuted = useCallback(() => {
        if (!spaceID) {
            return
        }
        // setSpaceMuted(spaceID.networkId, !spaceIsMuted)
        mutateNotificationSettings({
            spaceId: spaceID,
            muteSetting: toggleMuteSetting(spaceMuteSetting),
        })
    }, [spaceID, mutateNotificationSettings, spaceMuteSetting])

    const onMembersClick = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.TOWN_MEMBERS)
    }, [openPanel])

    const onManageRolesClick = useEvent(() => {
        if (!isRolesPanel) {
            Analytics.getInstance().track('clicked on manage roles', {
                spaceId: spaceID,
            })
            openPanel(CHANNEL_INFO_PARAMS.ROLES)
            if (isTouch) {
                setActiveModal(CHANNEL_INFO_PARAMS.ROLES)
            }
        }
    })

    const onEditSpaceSettingsClick = useEvent(() => {
        if (!isSpaceSettingsPanel) {
            openPanel(CHANNEL_INFO_PARAMS.SPACE_SETTINGS_NAVIGATION)
            if (isTouch) {
                setActiveModal(CHANNEL_INFO_PARAMS.SPACE_SETTINGS_NAVIGATION)
            }
        }
    })

    const onBannedUsersClick = useEvent(() => {
        if (!isBannedUsersPanel) {
            openPanel(CHANNEL_INFO_PARAMS.BANNED)
            if (isTouch) {
                setActiveModal(CHANNEL_INFO_PARAMS.BANNED)
            }
        }
    })

    const onLeaveClick = useCallback(() => {
        setActiveModal('confirm-leave')
        Analytics.getInstance().track('clicked leave town')
    }, [setActiveModal])

    const setOptimisticSpaceInitialized = useAppProgressStore(
        (state) => state.setOptimisticSpaceInitialized,
    )
    const leaveTown = useCallback(async () => {
        if (!spaceID) {
            return
        }

        await leaveRoom(spaceID)
        await removeTownNotificationSettings(spaceID)

        // clean up
        setOptimisticSpaceInitialized(spaceID, false)

        Analytics.getInstance().track('confirmed leave town', {
            spaceId: spaceID,
        })

        setTimeout(() => {
            navigate('/')
        }, 1000)
    }, [
        leaveRoom,
        navigate,
        removeTownNotificationSettings,
        setOptimisticSpaceInitialized,
        spaceID,
    ])

    const onEditTownInfoClick = useCallback(() => {
        setActiveModal(TOWN_INFO_PARAMS.EDIT_TOWN_NAME)
    }, [setActiveModal])

    const setModalUndefined = useCallback(() => setActiveModal(undefined), [])

    const { uploadTownImageToStream } = useUploadAttachment()
    const isUploadingSpaceIconRef = useRef<boolean>(false)
    const { toast } = useRefreshSpaceMember(space?.id)

    const [spaceImageInvalidationId, setSpaceImageInvalidationId] = useState<string | undefined>()
    useWaitForInvalidation(spaceImageInvalidationId, {
        onSuccess: () => popupToast(toast, { duration: Infinity }),
    })

    const onUploadSpaceIcon = useCallback(
        async ({ file, id: spaceId, type, setProgress }: UploadImageRequestConfig) => {
            if (isUploadingSpaceIconRef.current) {
                return
            }

            if (type === 'spaceIcon' && isValidStreamId(spaceId) && casablancaClient) {
                isUploadingSpaceIconRef.current = true
                try {
                    // upload the space icon
                    const { invalidationId } = await uploadTownImageToStream(
                        spaceId,
                        file,
                        setProgress,
                    )
                    setSpaceImageInvalidationId(invalidationId)
                } finally {
                    isUploadingSpaceIconRef.current = false
                }
            }
        },
        [casablancaClient, uploadTownImageToStream],
    )

    return (
        <>
            {space?.id && (
                <Stack centerContent padding>
                    {shareButtonEnabled && (
                        <Stack horizontal paddingX="sm" width="100%">
                            <Box grow />
                            <IconButton
                                icon="share"
                                background="level2"
                                color="default"
                                onClick={onSharePressed}
                            />
                        </Stack>
                    )}
                    <FormRender>
                        {({ register, formState, setError, clearErrors }) => (
                            <LargeUploadImageTemplate
                                type="spaceIcon"
                                formFieldName="spaceIcon"
                                canEdit={Boolean(canEdit)}
                                resourceId={space.id}
                                setError={setError}
                                register={register}
                                formState={formState}
                                clearErrors={clearErrors}
                                imageRestrictions={{
                                    // no limits on dimensions for spaces
                                    minDimension: {
                                        message: '',
                                        min: 0,
                                    },
                                }}
                                onUploadImage={onUploadSpaceIcon}
                            >
                                <TownContractOpener address={address}>
                                    <InteractiveSpaceIcon
                                        spaceId={space.id}
                                        size="lg"
                                        spaceName={space.name}
                                        address={address}
                                    />
                                </TownContractOpener>
                            </LargeUploadImageTemplate>
                        )}
                    </FormRender>
                </Stack>
            )}
            <Stack gap>
                <TokensGatingSpace
                    spaceId={spaceID}
                    canEdit={!!canEdit}
                    onClick={onEditSpaceSettingsClick}
                />
                <EditTownInfo
                    canEdit={isOwner}
                    name={space?.name}
                    owner={owner}
                    address={address}
                    shortDescription={shortDescription}
                    longDescription={longDescription}
                    onEdit={onEditTownInfoClick}
                />
                <TownTreasury {...contractSpaceInfo} />

                {!!owner && <TownOwner {...contractSpaceInfo} />}
                <PanelButton disabled={isSettingNotification} onClick={onShowTownPreview}>
                    <Icon type="search" size="square_sm" color="gray2" />
                    <Paragraph color="default">Preview Town Page</Paragraph>
                </PanelButton>
                {isOwner && (
                    <PanelButton onClick={onEditSpaceSettingsClick}>
                        <Icon type="treasury" size="square_sm" color="gray2" />
                        <Paragraph color="default">Edit Membership Settings</Paragraph>
                    </PanelButton>
                )}

                {canEdit && (
                    <PanelButton onClick={onManageRolesClick}>
                        <Icon type="personEdit" size="square_sm" color="gray2" />
                        <Paragraph color="default">Manage Roles</Paragraph>
                    </PanelButton>
                )}
                <PanelButton onClick={onMembersClick}>
                    <Icon type="people" size="square_sm" color="gray2" />
                    <Paragraph color="default">
                        {`${memberIds.length} member${memberIds.length > 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>
                {space?.name && (
                    <PanelButton disabled={isSettingNotification} onClick={onToggleSpaceMuted}>
                        <Icon
                            type={spaceIsMuted ? 'muteActive' : 'muteInactive'}
                            size="square_sm"
                            color="gray2"
                        />
                        <Paragraph color="default">
                            {spaceIsMuted ? 'Unmute' : 'Mute'} #{space.name}
                        </Paragraph>
                    </PanelButton>
                )}
                <PanelButton disabled={channels.length === 0} onClick={onShowBrowseChannels}>
                    <Icon type="tag" size="square_sm" color="gray2" />
                    <Paragraph color="default">
                        {`${channels.length} channel${channels.length != 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>

                {canBan && (
                    <BannedUsersPanelButton spaceId={spaceID} onClick={onBannedUsersClick} />
                )}
                <PanelButton tone="negative" onClick={onLeaveClick}>
                    <Icon type="logout" size="square_sm" />
                    <Paragraph color="error">Leave {space?.name}</Paragraph>
                </PanelButton>
            </Stack>

            <Stack grow padding paddingBottom="lg" justifyContent="end">
                {/* footer content */}
            </Stack>

            {activeModal === 'confirm-leave' && (
                <ConfirmLeaveModal
                    text={space?.name ? `Leave ${space.name}?` : 'Leave town?'}
                    onConfirm={leaveTown}
                    onCancel={setModalUndefined}
                />
            )}

            {activeModal === TOWN_INFO_PARAMS.EDIT_TOWN_NAME && (
                <TownInfoModal onHide={setModalUndefined} />
            )}

            {activeModal === 'preview' && (
                <ModalContainer padding="none" border="none" onHide={setModalUndefined}>
                    <Box
                        position="relative"
                        style={{
                            height: 'calc(100vh - 100px)',
                            width: isTouch ? '100%' : 'calc(100vw - 100px)',
                        }}
                    >
                        <PublicTownPageForAuthenticatedUser
                            isPreview
                            onClosePreview={setModalUndefined}
                        />
                    </Box>
                </ModalContainer>
            )}

            {activeModal === 'wallets' && (
                <ModalContainer touchTitle="Wallets" onHide={setModalUndefined}>
                    <WalletLinkingPanel />
                </ModalContainer>
            )}

            {activeModal === 'space-settings' && (
                <ModalContainer touchTitle="Edit Me" onHide={setModalUndefined}>
                    <SpaceSettingsNavigationPanel />
                </ModalContainer>
            )}

            {isRolesPanel && <RolesPanel />}

            {activeModal === CHANNEL_INFO_PARAMS.ROLES && (
                <ModalContainer padding="none" border="none" onHide={setModalUndefined}>
                    <RolesPanel />
                </ModalContainer>
            )}
        </>
    )
}

type ContractProps = { owner?: string; address?: string; tokenId?: BigNumberish }

const ContractWrap = (props: {
    contract: ContractProps
    label: string
    onClick?: () => void
    children: (props: {
        contract: ContractProps
        isOwner: boolean
        ownerUser: LookupUser | undefined
    }) => JSX.Element
}) => {
    const { children, label, onClick } = props
    const { loggedInWalletAddress } = useConnectivity()
    // the owner in the contract is the smart account, we need to get the user id
    const { data: spaceOwnerRiverUserId } = useGetRootKeyFromLinkedWallet({
        walletAddress: props.contract?.owner,
    })

    const ownerUser = useUser(spaceOwnerRiverUserId)
    const isOwner = ownerUser?.userId === loggedInWalletAddress

    const _onClick = useCallback(() => {
        if (!isOwner) {
            return
        }
        onClick?.()
    }, [isOwner, onClick])

    return (
        <Stack padding="md" gap="sm" background="level2" rounded="sm">
            <Stack horizontal justifyContent="spaceBetween">
                <Paragraph strong color="default">
                    {label}
                </Paragraph>
                {isOwner && onClick && <TextButton onClick={_onClick}>Transfer</TextButton>}
            </Stack>
            {children({
                contract: props.contract,
                ownerUser,
                isOwner,
            })}
        </Stack>
    )
}

const TownTreasury = (props: ContractProps) => {
    const { owner, address, tokenId } = props
    const { data: balance } = useBalance({ address: address as Address, refetchInterval: 30_000 })

    const { openPanel } = usePanelActions()
    const openTransferTreasury = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.TRANSFER_ASSETS, {
            assetSource: isAddress(address) ? address : undefined,
        })
    }, [address, openPanel])

    if (!balance) {
        return null
    }

    return (
        <ContractWrap
            contract={{
                address,
                owner,
                tokenId,
            }}
            label="Town Treasury"
            onClick={openTransferTreasury}
        >
            {() => (
                <Stack horizontal gap="sm" alignItems="center">
                    <Text as="span">
                        {balance.formatted}{' '}
                        <Text strong display="inline" as="span">
                            ETH
                        </Text>
                    </Text>
                    <Icon type="base" />
                </Stack>
            )}
        </ContractWrap>
    )
}

const TownOwner = (props: ContractProps) => {
    const { owner, address, tokenId } = props
    const { openPanel } = usePanelActions()
    const openFounderPanel = useCallback(
        (ownerUser: LookupUser) => {
            if (ownerUser) {
                openPanel(CHANNEL_INFO_PARAMS.PROFILE, { profileId: owner })
            }
        },
        [openPanel, owner],
    )

    const { spaceDapp } = useTownsClient()
    const ownerContract = spaceDapp?.config.addresses.spaceOwner

    const openSeaNft: `0x${string}/${number}` | undefined = ownerContract
        ? `${ownerContract}/${Number(tokenId)}`
        : undefined

    return (
        <ContractWrap
            contract={{
                address,
                owner,
                tokenId,
            }}
            label="Founder"
        >
            {({ ownerUser }) =>
                ownerUser ? (
                    <Box horizontal gap="sm">
                        <Box
                            centerContent
                            cursor="pointer"
                            onClick={() => openFounderPanel(ownerUser)}
                        >
                            {ownerUser && <Avatar size="avatar_x4" userId={ownerUser.userId} />}
                        </Box>
                        <Box overflow="hidden" paddingY="xs" gap="sm">
                            <Box cursor="pointer" onClick={() => openFounderPanel(ownerUser)}>
                                <Paragraph truncate data-testid="owner">
                                    {ownerUser && getPrettyDisplayName(ownerUser)}
                                </Paragraph>
                            </Box>
                            {address && (
                                <ContractInfoButtons
                                    ownerAddress={owner}
                                    contractAddress={ownerContract ?? address}
                                    nft={openSeaNft}
                                />
                            )}
                        </Box>
                    </Box>
                ) : (
                    <Paragraph color="gray2">{owner ? shortAddress(owner) : ''}</Paragraph>
                )
            }
        </ContractWrap>
    )
}

const TownContractOpener = (props: { address: string; children?: React.ReactNode }) => {
    const { address } = props
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const onClick = useCallback(() => {
        if (!chainId) {
            return
        }
        window.open(`${openSeaAssetUrl(chainId, address)}`, '_blank', 'noopener,noreferrer')
    }, [chainId, address])

    return (
        <Box padding="x4">
            <Box tooltip="View official town NFT" onClick={onClick}>
                <Box inset="md">{props.children}</Box>
            </Box>
        </Box>
    )
}

const BannedUsersPanelButton = (props: { onClick: () => void; spaceId?: string }) => {
    const { onClick, spaceId } = props
    const { userIds } = useBannedWalletAddresses(spaceId)

    if (!userIds || userIds.length === 0) {
        return null
    }

    return (
        <PanelButton onClick={onClick}>
            <Icon type="ban" size="square_sm" color="negative" />
            <Paragraph color="error">Banned Users</Paragraph>
        </PanelButton>
    )
}

const TokensGatingSpace = ({
    spaceId,
    canEdit,
    onClick,
}: {
    spaceId: string | undefined
    canEdit: boolean
    onClick: () => void
}) => {
    const { data: entitlements } = useEntitlements(spaceId ?? '')

    if (!entitlements.hasEntitlements) {
        return null
    }

    return (
        <Stack
            hoverable={canEdit}
            background="level2"
            padding="none"
            borderRadius="xl"
            cursor={canEdit ? 'pointer' : 'auto'}
            onClick={onClick}
        >
            <Box
                horizontal
                gap="sm"
                alignItems="center"
                paddingY="sm"
                paddingX="md"
                justifyContent="spaceBetween"
            >
                <Box horizontal centerContent gap="sm">
                    <Icon type="lock" size="square_sm" color="gray2" />
                    <Paragraph size="sm" color="default">
                        Gated
                    </Paragraph>
                </Box>
                <Box horizontal gap="sm" alignItems="center">
                    <Box>
                        <EntitlementsDisplay entitlements={entitlements} />
                    </Box>
                    {canEdit && (
                        <IconButton icon="edit" size="square_sm" color="gray2" onClick={onClick} />
                    )}
                </Box>
            </Box>
        </Stack>
    )
}
