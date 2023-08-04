import React, { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast/headless'
import { useNavigate } from 'react-router'
import { Link } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    createUserIdFromEthereumAddress,
    useHasPermission,
    useSpaceData,
    useSpaceId,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { EditModeContainer, TextButton } from '@components/UserProfile/UserProfile'
import {
    Avatar,
    Box,
    BoxProps,
    FormRender,
    Icon,
    MotionStack,
    Panel,
    PanelButton,
    Paragraph,
    Stack,
    Text,
    TextField,
} from '@ui'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useGetSpaceTopic, useSetSpaceTopic } from 'hooks/useSpaceTopic'
import { PATHS } from 'routes'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { vars } from 'ui/styles/vars.css'
import { transitions } from 'ui/transitions/transitions'
import { shortAddress } from 'ui/utils/utils'
import { useDevice } from 'hooks/useDevice'
import { MembersPageTouchModal } from '@components/MembersPage/MembersPage'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useAuth } from 'hooks/useAuth'
import {
    toggleMuteSetting,
    useMuteSettings,
    useSetMuteSettingForChannelOrSpace,
} from 'api/lib/notificationSettings'
import { useContractSpaceInfo } from '../hooks/useContractSpaceInfo'
import { useEnvironment } from '../hooks/useEnvironmnet'
import { env } from '../utils/environment'
import { AllChannelsList } from './AllChannelsList/AllChannelsList'

const MdGap = ({ children, ...boxProps }: { children: JSX.Element } & BoxProps) => (
    <Box padding="md" gap="md" {...boxProps} background="level2" rounded="sm">
        {children}
    </Box>
)

enum InputId {
    SpaceName = 'DisplayName',
}

export const SpaceInfoPanel = () => {
    const space = useSpaceData()
    const { isTouch } = useDevice()

    const { client, chainId, leaveRoom } = useZionClient()
    const channels = useSpaceChannels()
    const { loggedInWalletAddress } = useAuth()

    const { data } = useContractSpaceInfo(space?.id?.networkId)
    const address = data?.address ?? ''
    const navigate = useNavigate()
    const { hasPermission: canEdit } = useHasPermission({
        spaceId: space?.id.networkId ?? '',
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })

    const { matrixUrl } = useEnvironment()
    const [isEdit, setIsEdit] = useState(false)
    const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null)
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const { data: roomTopic, isLoading: isLoadingRoomTopic } = useGetSpaceTopic(space?.id.networkId)

    const { mutate, isLoading: isSettingSpaceTopic } = useSetSpaceTopic(space?.id)

    const matrixUserOwner = useMemo(() => {
        if (!data?.owner || !chainId) {
            return undefined
        }
        const _homeserverUrl = new URL(matrixUrl || '')
        const userId = createUserIdFromEthereumAddress(
            data.owner,
            chainId,
        ).matrixUserIdLocalpart.toLowerCase()
        const matrixIdFromOwnerAddress = `@${userId}:${_homeserverUrl.hostname}`
        return client?.getUser(matrixIdFromOwnerAddress)
    }, [client, data?.owner, matrixUrl, chainId])

    const { members } = useSpaceMembers()
    const [activeModal, setActiveModal] = useState<'browse-channels' | 'members' | undefined>(
        undefined,
    )
    const onHideBrowseChannels = useEvent(() => setActiveModal(undefined))
    const onShowBrowseChannels = useEvent(() => setActiveModal('browse-channels'))

    const onClose = useEvent(() => {
        navigate('..')
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
        mutate(textAreaRef.current.value, {
            onSuccess: async () => {
                setIsEdit(false)
                setEditErrorMessage(null)
            },
            onError: (error) => {
                if (errorHasInvalidCookieResponseHeader(error)) {
                    toast.custom((t) => (
                        <InvalidCookieNotification toast={t} actionMessage="edit the description" />
                    ))
                }
                setEditErrorMessage("We weren't able to save your changes. Please try again later.")
            },
        })
    })

    const onSaveItem = useEvent((id: string, content: undefined | string) => {
        switch (id) {
            case InputId.SpaceName: {
                if (!content || !content.match(/[a-z0-9-_()]+/i)) {
                    throw new Error('Use alphanumeric characters only (TBD)')
                }
                if (client && space?.id) {
                    return client.setRoomName(space?.id, content)
                }
            }
        }
    })

    const spaceID = useSpaceId()
    const { spaceIsMuted, spaceMuteSetting } = useMuteSettings({
        spaceId: spaceID?.networkId,
    })
    const { mutate: mutateNotificationSettings, isLoading: isSettingNotification } =
        useSetMuteSettingForChannelOrSpace()

    const onToggleSpaceMuted = useCallback(() => {
        if (!spaceID) {
            return
        }
        // setSpaceMuted(spaceID.networkId, !spaceIsMuted)
        mutateNotificationSettings({
            spaceId: spaceID.networkId,
            muteSetting: toggleMuteSetting(spaceMuteSetting),
        })
    }, [spaceID, mutateNotificationSettings, spaceMuteSetting])

    const onMembersClick = useCallback(() => {
        if (isTouch) {
            setActiveModal('members')
        } else {
            navigate(`/${PATHS.SPACES}/${spaceID?.slug}/members/info`)
        }
    }, [isTouch, navigate, spaceID?.slug])

    const onSettingsClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${spaceID?.slug}/settings`)
    })

    const onLeaveClick = useCallback(async () => {
        if (!spaceID) {
            return
        }
        await leaveRoom(spaceID)
        setTimeout(() => {
            navigate('/')
        }, 1000)
    }, [leaveRoom, navigate, spaceID])

    return (
        <Panel modalPresentable label="Town Info" onClose={onClose}>
            {space?.id && (
                <Stack centerContent gap padding>
                    <FormRender>
                        {({ register, formState, setError, clearErrors }) => (
                            <LargeUploadImageTemplate
                                type="spaceIcon"
                                formFieldName="spaceIcon"
                                canEdit={Boolean(canEdit)}
                                resourceId={space.id.networkId}
                                setError={setError}
                                register={register}
                                formState={formState}
                                clearErrors={clearErrors}
                            >
                                <TownContractOpener>
                                    <InteractiveSpaceIcon
                                        spaceId={space.id.networkId}
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
            <Stack gap padding="lg">
                <MdGap>
                    <Stack>
                        <EditModeContainer
                            inputId={InputId.SpaceName}
                            canEdit={canEdit}
                            initialValue={space?.name}
                            onSave={onSaveItem}
                        >
                            {({
                                editMenu,
                                value,
                                isEditing,
                                errorComponent,
                                error,
                                handleEdit,
                                onChange,
                                handleSave,
                            }) => (
                                <>
                                    <MotionStack
                                        grow
                                        horizontal
                                        gap="sm"
                                        alignItems="start"
                                        minHeight="input_md"
                                        insetTop="xs"
                                        animate={{
                                            paddingTop: isEditing ? vars.space.sm : ' 0px',
                                            paddingBottom: isEditing ? vars.space.sm : ' 0px',
                                        }}
                                        transition={transitions.button}
                                    >
                                        {!isEditing ? (
                                            <Box
                                                grow
                                                horizontal
                                                alignItems="center"
                                                gap="xs"
                                                height="x5"
                                                onClick={
                                                    canEdit && !isEditing ? handleEdit : undefined
                                                }
                                            >
                                                <Paragraph strong size="lg" color="default">
                                                    {value}
                                                </Paragraph>
                                            </Box>
                                        ) : (
                                            <Stack grow>
                                                <TextField
                                                    autoFocus
                                                    tone={error ? 'error' : undefined}
                                                    background="level2"
                                                    value={value}
                                                    placeholder="Enter display name..."
                                                    height="x5"
                                                    style={{
                                                        width: 0,
                                                        minWidth: '100%',
                                                    }} // shrink hack
                                                    onChange={onChange}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleSave()
                                                        } else if (e.key === 'Escape') {
                                                            handleEdit()
                                                        }
                                                    }}
                                                />
                                                {errorComponent}
                                            </Stack>
                                        )}
                                        <Box height="x5" justifyContent="center">
                                            {editMenu}
                                        </Box>
                                    </MotionStack>
                                </>
                            )}
                        </EditModeContainer>
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
                            Owner
                        </Paragraph>
                        {matrixUserOwner ? (
                            <>
                                <Link to={`../profile/${matrixUserOwner.userId}?spaceInfo`}>
                                    <Box flexDirection="row" gap="sm">
                                        {matrixUserOwner && (
                                            <Avatar
                                                size="avatar_x4"
                                                userId={matrixUserOwner.userId}
                                            />
                                        )}
                                        <Box justifyContent="spaceBetween">
                                            {matrixUserOwner &&
                                                getPrettyDisplayName(matrixUserOwner).name}
                                            <Paragraph color="gray2">
                                                {data?.owner ? shortAddress(data.owner) : ''}
                                            </Paragraph>
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

                <PanelButton onClick={onMembersClick}>
                    <Icon type="people" size="square_sm" color="gray2" />
                    <Paragraph color="default">
                        {`${members.length} member${members.length > 1 ? `s` : ``}`}
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

                {canEdit && !isTouch && (
                    <PanelButton onClick={onSettingsClick}>
                        <Icon type="settings" size="square_sm" color="gray2" />
                        <Paragraph color="default">Settings</Paragraph>
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
