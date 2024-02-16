import { Permission } from '@river/web3'
import React, { useCallback, useRef, useState } from 'react'
import { toast } from 'react-hot-toast/headless'
import { useNavigate } from 'react-router'
import { Link, useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    useHasPermission,
    useSpaceData,
    useSpaceId,
    useSpaceMembers,
    useUser,
    useZionClient,
} from 'use-zion-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { MembersPageTouchModal } from '@components/MembersPage/MembersPage'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { Panel, PanelButton } from '@components/Panel/Panel'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { SpaceNameModal } from '@components/SpaceNameModal/SpaceNameModal'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import {
    Box,
    BoxProps,
    FormRender,
    Icon,
    IconButton,
    Paragraph,
    Stack,
    Text,
    TextButton,
} from '@ui'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import {
    toggleMuteSetting,
    useMuteSettings,
    useSetMuteSettingForChannelOrSpace,
} from 'api/lib/notificationSettings'
import { useAuth } from 'hooks/useAuth'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDevice } from 'hooks/useDevice'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useGetSpaceTopic, useSetSpaceTopic } from 'hooks/useSpaceTopic'
import { PATHS } from 'routes'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { getInviteUrl, shortAddress } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ConfirmLeaveModal } from '@components/ConfirmLeaveModal/ConfirmLeaveModal'
import { Avatar } from '@components/Avatar/Avatar'
import { WalletLinkingPanel } from '@components/Web3/WalletLinkingPanel'
import { RolesPanel } from '@components/SpaceSettingsPanel/RolesPanel'
import { useContractSpaceInfo } from '../hooks/useContractSpaceInfo'
import { env } from '../utils/environment'
import { AllChannelsList } from './AllChannelsList/AllChannelsList'
import { PublicTownPage } from './PublicTownPage'

const MdGap = ({ children, ...boxProps }: { children: JSX.Element } & BoxProps) => (
    <Box padding="md" gap="md" {...boxProps} background="level2" rounded="sm">
        {children}
    </Box>
)

export const SpaceInfoPanel = () => {
    const space = useSpaceData()
    const { isTouch } = useDevice()
    const [searchParams, setSearchParams] = useSearchParams()
    // touch handles roles panel with modals
    const isRolesPanel = !isTouch && searchParams.get('roles') != null

    const { leaveRoom } = useZionClient()
    const channels = useSpaceChannels()
    const { loggedInWalletAddress } = useAuth()

    const { data } = useContractSpaceInfo(space?.id)
    const address = data?.address ?? ''
    const navigate = useNavigate()
    const { hasPermission: canEdit } = useHasPermission({
        spaceId: space?.id ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })

    const [isEdit, setIsEdit] = useState(false)
    const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null)
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const { data: roomTopic, isLoading: isLoadingRoomTopic } = useGetSpaceTopic(space?.id)

    const { mutate, isPending: isSettingSpaceTopic } = useSetSpaceTopic(space?.id)

    const spaceOwner = useUser(data?.owner)

    const { memberIds } = useSpaceMembers()
    const [activeModal, setActiveModal] = useState<
        | 'browse-channels'
        | 'members'
        | 'confirm-leave'
        | 'settings'
        | 'preview'
        | 'wallets'
        | 'roles'
        | undefined
    >(undefined)

    const onHideBrowseChannels = useEvent(() => setActiveModal(undefined))
    const onShowBrowseChannels = useEvent(() => setActiveModal('browse-channels'))

    const onHideTownPreview = useEvent(() => setActiveModal(undefined))
    const onShowTownPreview = useEvent(() => setActiveModal('preview'))

    const onClose = useEvent(() => {
        navigate('../')
    })

    const onEdit = useEvent(() => {
        setIsEdit(true)
        setEditErrorMessage(null)
        setTimeout(() => {
            textAreaRef.current?.focus()
        })
    })
    const onCancel = useEvent(() => setIsEdit(false))
    const onSave = useEvent(() => {
        if (!textAreaRef.current?.value.length || !canEdit) {
            return
        }
        mutate(
            { description: textAreaRef.current.value },
            {
                onSuccess: async () => {
                    setIsEdit(false)
                    setEditErrorMessage(null)
                },
                onError: (error) => {
                    if (errorHasInvalidCookieResponseHeader(error)) {
                        toast.custom((t) => (
                            <InvalidCookieNotification
                                toast={t}
                                actionMessage="edit the description"
                            />
                        ))
                    }
                    setEditErrorMessage(
                        "We weren't able to save your changes. Please try again later.",
                    )
                },
            },
        )
    })

    const shareButtonEnabled = isTouch && navigator.share
    const onSharePressed = useEvent(async () => {
        if (!space) {
            return
        }
        const url = getInviteUrl(space.id)
        try {
            await navigator.share({ title: space.name, url: url })
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
            navigate(`/${PATHS.SPACES}/${spaceID}/members/info`)
        }
    }, [isTouch, navigate, spaceID])

    const onManageRolesClick = useEvent(() => {
        if (!isRolesPanel) {
            searchParams.set('roles', '')
            setSearchParams(searchParams)
            if (isTouch) {
                setActiveModal('roles')
            }
        }
    })

    const onLeaveClick = useCallback(() => {
        setActiveModal('confirm-leave')
    }, [setActiveModal])

    const leaveTown = useCallback(async () => {
        if (!spaceID) {
            return
        }
        await leaveRoom(spaceID)
        setTimeout(() => {
            navigate('/')
        }, 1000)
    }, [leaveRoom, navigate, spaceID])

    const onEditSpaceNameClick = useCallback(() => {
        setActiveModal('settings')
    }, [setActiveModal])

    const { createLink: createProfileLink } = useCreateLink()

    const ownerProfileLink = spaceOwner && createProfileLink({ profileId: spaceOwner.userId })

    return (
        <Panel modalPresentable label="Town Info" onClose={onClose}>
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
                            >
                                <TownContractOpener>
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
            <Stack gap padding>
                <MdGap>
                    <Stack gap>
                        <Stack horizontal alignItems="center" width="100%">
                            <Paragraph strong truncate size="lg" color="default">
                                {space?.name ?? ''}
                            </Paragraph>
                            <Box grow />
                            {canEdit && !isTouch && (
                                <TextButton onClick={onEditSpaceNameClick}>Edit</TextButton>
                            )}
                        </Stack>
                        {address && (
                            <ClipboardCopy
                                label={shortAddress(address)}
                                clipboardContent={address}
                            />
                        )}
                    </Stack>
                </MdGap>

                {(canEdit || roomTopic) && (
                    <MdGap data-testid="about-section">
                        <>
                            <Box horizontal justifyContent="spaceBetween" alignItems="center">
                                <Paragraph strong color="default">
                                    About
                                </Paragraph>{' '}
                                {canEdit &&
                                    (isEdit ? (
                                        <Box horizontal gap="sm">
                                            <TextButton
                                                disabled={isSettingSpaceTopic}
                                                onClick={onCancel}
                                            >
                                                Cancel
                                            </TextButton>
                                            <Box horizontal gap>
                                                <TextButton
                                                    disabled={isSettingSpaceTopic}
                                                    color="default"
                                                    data-testid="save-button"
                                                    onClick={onSave}
                                                >
                                                    Save
                                                </TextButton>
                                                {isSettingSpaceTopic && <ButtonSpinner />}
                                            </Box>
                                        </Box>
                                    ) : (
                                        <TextButton
                                            data-testid="edit-description-button"
                                            onClick={onEdit}
                                        >
                                            Edit
                                        </TextButton>
                                    ))}
                            </Box>
                            {!isLoadingRoomTopic &&
                                (isEdit ? (
                                    <>
                                        <TextArea
                                            data-testid="edit-description-textarea"
                                            ref={textAreaRef}
                                            paddingY="md"
                                            background="level2"
                                            defaultValue={roomTopic}
                                            height="150"
                                            maxLength={400}
                                            style={{ paddingRight: '2.5rem' }}
                                        />
                                        {editErrorMessage && (
                                            <Text color="negative" size="sm">
                                                {editErrorMessage}
                                            </Text>
                                        )}
                                    </>
                                ) : (
                                    <Paragraph color="gray2">
                                        {roomTopic
                                            ? roomTopic
                                            : 'Click "edit" to add a description'}
                                    </Paragraph>
                                ))}
                        </>
                    </MdGap>
                )}

                <MdGap>
                    <>
                        <Paragraph strong color="default">
                            Founder
                        </Paragraph>
                        {spaceOwner && ownerProfileLink ? (
                            <>
                                <Link to={ownerProfileLink + `?spaceInfo`}>
                                    <Box flexDirection="row" gap="sm">
                                        {spaceOwner && (
                                            <Avatar size="avatar_x4" userId={spaceOwner.userId} />
                                        )}
                                        <Box
                                            justifyContent="spaceBetween"
                                            overflow="hidden"
                                            paddingY="xs"
                                            insetY="xxs"
                                            gap="paragraph"
                                        >
                                            <Paragraph truncate data-testid="owner">
                                                {spaceOwner && getPrettyDisplayName(spaceOwner)}
                                            </Paragraph>

                                            {data?.owner && (
                                                <ClipboardCopy
                                                    label={shortAddress(data.owner)}
                                                    clipboardContent={address}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Paragraph color="gray2">
                                    {data?.owner ? shortAddress(data.owner) : ''}
                                </Paragraph>
                            </>
                        )}
                    </>
                </MdGap>

                <PanelButton disabled={isSettingNotification} onClick={onShowTownPreview}>
                    <Icon type="search" size="square_sm" color="gray2" />
                    <Paragraph color="default">Preview</Paragraph>
                </PanelButton>

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

                <PanelButton tone="negative" onClick={onLeaveClick}>
                    <Icon type="logout" size="square_sm" />
                    <Paragraph color="error">Leave {space?.name}</Paragraph>
                </PanelButton>
            </Stack>

            <Stack grow padding paddingBottom="lg" justifyContent="end">
                {/* footer content */}
            </Stack>

            {activeModal === 'browse-channels' && (
                <ModalContainer
                    minWidth="500"
                    touchTitle="Browse channels"
                    onHide={onHideBrowseChannels}
                >
                    <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                </ModalContainer>
            )}

            {activeModal === 'members' && (
                <MembersPageTouchModal onHide={() => setActiveModal(undefined)} />
            )}

            {activeModal === 'confirm-leave' && (
                <ConfirmLeaveModal
                    text={space?.name ? `Leave ${space.name}?` : 'Leave town?'}
                    onConfirm={leaveTown}
                    onCancel={() => setActiveModal(undefined)}
                />
            )}

            {activeModal === 'settings' && (
                <SpaceNameModal onHide={() => setActiveModal(undefined)} />
            )}

            {activeModal === 'preview' && (
                <ModalContainer padding="none" border="none" onHide={onHideTownPreview}>
                    <Box
                        position="relative"
                        style={{ height: 'calc(100vh - 100px)' }}
                        pointerEvents="none"
                        onPointerDown={onHideTownPreview}
                    >
                        <PublicTownPage />
                    </Box>
                </ModalContainer>
            )}

            {activeModal === 'wallets' && (
                <ModalContainer touchTitle="Wallets" onHide={() => setActiveModal(undefined)}>
                    <WalletLinkingPanel />
                </ModalContainer>
            )}

            {isRolesPanel && <RolesPanel setActiveModal={(m) => setActiveModal(m)} />}

            {activeModal === 'roles' && (
                <ModalContainer
                    padding="none"
                    border="none"
                    onHide={() => setActiveModal(undefined)}
                >
                    <RolesPanel setActiveModal={(m) => setActiveModal(m)} />
                </ModalContainer>
            )}
        </Panel>
    )
}

const TownContractOpener = (props: { children?: React.ReactNode }) => {
    const onClick = useCallback(() => {
        window.open(env.VITE_TOWNS_TOKEN_URL, '_blank', 'noopener noreferrer')
    }, [])
    if (!env.VITE_TOWNS_TOKEN_URL) {
        return <>{props.children}</>
    }
    return (
        <Box padding="x4">
            <Box tooltip="View official town NFT" onClick={onClick}>
                <Box inset="md">{props.children}</Box>
            </Box>
        </Box>
    )
}
