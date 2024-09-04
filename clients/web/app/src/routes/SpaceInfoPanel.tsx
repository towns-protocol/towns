import { Permission } from '@river-build/web3'
import React, { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    convertRuleDataV1ToV2,
    useBannedWalletAddresses,
    useConnectivity,
    useContractSpaceInfo,
    useGetRootKeyFromLinkedWallet,
    useHasPermission,
    useIsSpaceOwner,
    useRoleDetails,
    useSpaceData,
    useSpaceId,
    useSpaceMembers,
    useTownsClient,
    useTownsContext,
    useUser,
} from 'use-towns-client'
import { isValidStreamId } from '@river-build/sdk'
import { UploadImageRequestConfig } from '@components/UploadImage/useOnImageChangeEvent'
import { EditTownInfo } from '@components/Panel/EditTownInfo'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { MembersPageTouchModal } from '@components/MembersPage/MembersPage'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { PanelButton } from '@components/Panel/PanelButton'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { TownInfoModal } from '@components/TownInfoModal/TownInfoModal'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { Box, BoxProps, FormRender, Icon, IconButton, Paragraph, Stack, Text } from '@ui'
import {
    toggleMuteSetting,
    useMuteSettings,
    useSetMuteSettingForChannelOrSpace,
} from 'api/lib/notificationSettings'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { CHANNEL_INFO_PARAMS, PATHS, TOWN_INFO_PARAMS } from 'routes'
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
import { convertRuleDataToTokenFormSchema } from '@components/Tokens/utils'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { useAppProgressStore } from '@components/AppProgressOverlay/store/appProgressStore'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useUploadAttachment } from '@components/MediaDropContext/useUploadAttachment'
import { PublicTownPage } from './PublicTownPage/PublicTownPage'
import { usePanelActions } from './layouts/hooks/usePanelActions'

const MdGap = ({ children, ...boxProps }: { children: JSX.Element } & BoxProps) => (
    <Box padding="md" gap="md" {...boxProps} background="level2" rounded="sm">
        {children}
    </Box>
)

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
        permission: Permission.Ban,
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
        if (isTouch) {
            setActiveModal('members')
        } else {
            navigate(`/${PATHS.SPACES}/${spaceID}/members?panel=${CHANNEL_INFO_PARAMS.TOWN_INFO}`)
        }
    }, [isTouch, navigate, spaceID])

    const onManageRolesClick = useEvent(() => {
        if (!isRolesPanel) {
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
    const onUploadSpaceIcon = useCallback(
        async ({ imageUrl, file, id: spaceId, type, setProgress }: UploadImageRequestConfig) => {
            if (isUploadingSpaceIconRef.current) {
                return
            }

            if (type === 'spaceIcon' && isValidStreamId(spaceId) && casablancaClient) {
                isUploadingSpaceIconRef.current = true
                try {
                    // upload the space icon
                    await uploadTownImageToStream(spaceId, file, setProgress)
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
                    address={address}
                    shortDescription={shortDescription}
                    longDescription={longDescription}
                    onEdit={onEditTownInfoClick}
                />
                {!!owner && <TownOwnerButton owner={owner} address={address} />}
                <PanelButton disabled={isSettingNotification} onClick={onShowTownPreview}>
                    <Icon type="search" size="square_sm" color="gray2" />
                    <Paragraph color="default">Preview</Paragraph>
                </PanelButton>
                {isOwner && (
                    <PanelButton onClick={onEditSpaceSettingsClick}>
                        <Icon type="treasury" size="square_sm" color="gray2" />
                        <Paragraph color="default">Edit Membership Settings</Paragraph>
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
                    <Paragraph color="default" fontWeight="medium">
                        {`${channels.length} channel${channels.length != 1 ? `s` : ``}`}
                    </Paragraph>
                </PanelButton>
                {canEdit && (
                    <PanelButton onClick={onManageRolesClick}>
                        <Icon type="personEdit" size="square_sm" color="gray2" />
                        <Paragraph color="default">Manage Roles</Paragraph>
                    </PanelButton>
                )}
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

            {activeModal === 'members' && <MembersPageTouchModal onHide={setModalUndefined} />}

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
                        <PublicTownPage isPreview onClosePreview={setModalUndefined} />
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

const TownOwnerButton = (props: { owner: string; address: string }) => {
    const { owner, address } = props
    // the owner in the contract is the smart account, we need to get the user id
    const { data: spaceOwnerRiverUserId } = useGetRootKeyFromLinkedWallet({
        walletAddress: owner,
    })

    const ownerUser = useUser(spaceOwnerRiverUserId)
    const { openPanel } = usePanelActions()
    const openFounderPanel = useCallback(() => {
        if (ownerUser) {
            openPanel(CHANNEL_INFO_PARAMS.PROFILE, { profileId: owner })
        }
    }, [openPanel, owner, ownerUser])

    return (
        <PanelButton height="auto" onClick={openFounderPanel}>
            <Stack gap>
                <Paragraph strong color="default">
                    Founder
                </Paragraph>
                {ownerUser ? (
                    <Box flexDirection="row" gap="sm" onClick={openFounderPanel}>
                        {ownerUser && <Avatar size="avatar_x4" userId={ownerUser.userId} />}
                        <Box
                            justifyContent="spaceBetween"
                            overflow="hidden"
                            paddingY="xs"
                            insetY="xxs"
                            gap="paragraph"
                        >
                            <Paragraph truncate data-testid="owner">
                                {ownerUser && getPrettyDisplayName(ownerUser)}
                            </Paragraph>

                            {owner && (
                                <ClipboardCopy
                                    label={shortAddress(owner)}
                                    clipboardContent={address}
                                />
                            )}
                        </Box>
                    </Box>
                ) : (
                    <>
                        <Paragraph color="gray2">{owner ? shortAddress(owner) : ''}</Paragraph>
                    </>
                )}
            </Stack>
        </PanelButton>
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
    const { isLoading: isLoadingRoleDetails, roleDetails } = useRoleDetails(spaceId ?? '', 1)
    const tokens = roleDetails?.ruleData
        ? convertRuleDataToTokenFormSchema(
              roleDetails.ruleData.kind === 'v2'
                  ? roleDetails.ruleData.rules
                  : convertRuleDataV1ToV2(roleDetails.ruleData.rules),
          )
        : []

    if (isLoadingRoleDetails || tokens.length === 0) {
        return null
    }

    return (
        <MdGap padding="none">
            <Box horizontal gap="sm" alignItems="center" paddingY="sm" paddingX="md">
                <Box horizontal gap centerContent>
                    <Icon type="lock" size="square_sm" color="gray2" />
                    For Holders
                </Box>
                <Box
                    horizontal
                    gap="sm"
                    style={{
                        marginLeft: 'auto',
                    }}
                >
                    {tokens.slice(0, 3).map((token) => {
                        return (
                            <>
                                <TokenToDisplay
                                    key={token.address}
                                    contractAddress={token.address}
                                    chainId={token.chainId}
                                />
                            </>
                        )
                    })}
                </Box>
                {canEdit && (
                    <IconButton icon="edit" size="square_sm" color="gray2" onClick={onClick} />
                )}
                {tokens.length > 3 && `+${tokens.length - 3} more`}
            </Box>
        </MdGap>
    )
}

function TokenToDisplay({
    contractAddress,
    chainId,
}: {
    contractAddress: string
    chainId: number
}) {
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(contractAddress, chainId)

    return (
        <Box
            tooltip={
                <Box centerContent background="level1" padding="sm" rounded="sm" gap="sm">
                    <Text size="sm" textAlign="center">
                        {tokenDataWithChainId?.data.label ?? 'Unknown Token'}
                    </Text>
                    <NetworkName chainId={chainId} />
                    <Text size="sm" textAlign="center" color="gray2">
                        {tokenDataWithChainId?.data.address}
                    </Text>
                </Box>
            }
        >
            <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x3" />
        </Box>
    )
}
