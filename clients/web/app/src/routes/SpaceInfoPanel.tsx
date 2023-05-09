import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    createUserIdFromEthereumAddress,
    useSpaceData,
    useSpaceId,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast/headless'
import { motion } from 'framer-motion'
import {
    Avatar,
    Box,
    BoxProps,
    Button,
    FormRender,
    Panel,
    Paragraph,
    Stack,
    Text,
    TextField,
    Toggle,
} from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { useHasPermission } from 'hooks/useHasPermission'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useGetSpaceTopic, useSetSpaceTopic } from 'hooks/useSpaceTopic'
import { InteractiveSpaceIcon } from '@components/SpaceIcon'
import { EditModeContainer, TextButton } from '@components/UserProfile/UserProfile'
import { errorHasInvalidCookieResponseHeader } from 'api/apiClient'
import { InvalidCookieNotification } from '@components/Notifications/InvalidCookieNotification'
import { LargeUploadImageTemplate } from '@components/UploadImage/LargeUploadImageTemplate'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { vars } from 'ui/styles/vars.css'
import { PATHS } from 'routes'
import { transitions } from 'ui/transitions/transitions'
import { AllChannelsList } from './AllChannelsList/AllChannelsList'
import { useContractSpaceInfo } from '../hooks/useContractSpaceInfo'
import { useEnvironment } from '../hooks/useEnvironmnet'

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
    const { client, chainId, leaveRoom } = useZionClient()
    const channels = useSpaceChannels()

    const { data } = useContractSpaceInfo(space?.id?.networkId)
    const address = data?.address ?? ''
    const navigate = useNavigate()
    const { data: canEdit } = useHasPermission(Permission.ModifySpaceSettings)

    const { matrixUrl } = useEnvironment()
    const [isEdit, setIsEdit] = useState(false)
    const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null)
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const { data: roomTopic, isLoading: isLoadingRoomTopic } = useGetSpaceTopic(space?.id.networkId)

    const [isOfficialNFTToggled, setIsOfficialNFTToggled] = React.useState(false)
    const onToggleOfficialNFT = useCallback(() => setIsOfficialNFTToggled((t) => !t), [])

    const { mutate, isLoading } = useSetSpaceTopic(space?.id)

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

    const [isBrowseChannelsModalVisible, setBrowseChannelsModalVisible] = useState(false)
    const onHideBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(false))
    const onShowBrowseChannels = useEvent(() => setBrowseChannelsModalVisible(true))

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
    const onMembersClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${spaceID?.slug}/members/info`)
    })

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
        <Panel label="Town Info" onClose={onClose}>
            {space?.id && (
                <Stack centerContent gap padding>
                    {!isOfficialNFTToggled ? (
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
                                    <InteractiveSpaceIcon
                                        spaceId={space.id.networkId}
                                        size="lg"
                                        spaceName={space.name}
                                        address={address}
                                    />
                                </LargeUploadImageTemplate>
                            )}
                        </FormRender>
                    ) : (
                        <InteractiveSpaceIcon
                            spaceId={space.id.networkId}
                            size="lg"
                            spaceName={space.name}
                            address={address}
                            overrideSrc="/townsnft.png"
                        />
                    )}
                </Stack>
            )}
            <Stack gap padding="lg">
                <MdGap>
                    <Stack gap="sm">
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
                                                <Paragraph strong size="lg">
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
                                <Paragraph strong>About</Paragraph>{' '}
                                {canEdit &&
                                    (isEdit ? (
                                        <Box horizontal gap="sm">
                                            <TextButton disabled={isLoading} onClick={onCancel}>
                                                Cancel
                                            </TextButton>
                                            <Box horizontal gap>
                                                <TextButton
                                                    disabled={isLoading}
                                                    color="default"
                                                    data-testid="save-button"
                                                    onClick={onSave}
                                                >
                                                    Save
                                                </TextButton>
                                                {isLoading && <ButtonSpinner />}
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
                        <Paragraph strong>Owner</Paragraph>
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
                                            {matrixUserOwner && matrixUserOwner.displayName}
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

                <Button
                    icon="people"
                    size="button_md"
                    style={{ paddingLeft: vars.space.md }}
                    color="gray2"
                    onClick={onMembersClick}
                >
                    <Stack grow horizontal alignItems="center" gap="sm">
                        <Paragraph color="default">
                            {`${members.length} member${members.length > 1 ? `s` : ``}`}
                        </Paragraph>
                    </Stack>
                </Button>

                <Button
                    icon="tag"
                    style={{ paddingLeft: vars.space.md }}
                    color="gray2"
                    disabled={channels.length === 0}
                    onClick={onShowBrowseChannels}
                >
                    <Stack grow horizontal alignItems="center" gap="sm">
                        <Paragraph color="default">
                            {`${channels.length} channel${channels.length != 1 ? `s` : ``}`}
                        </Paragraph>
                    </Stack>
                </Button>

                {isBrowseChannelsModalVisible && (
                    <ModalContainer minWidth="500" onHide={onHideBrowseChannels}>
                        <AllChannelsList onHideBrowseChannels={onHideBrowseChannels} />
                    </ModalContainer>
                )}

                {canEdit && (
                    <Button
                        icon="settings"
                        style={{ paddingLeft: vars.space.md }}
                        color="gray2"
                        onClick={onSettingsClick}
                    >
                        <Stack grow horizontal alignItems="center" gap="sm">
                            <Paragraph color="default">Settings</Paragraph>
                        </Stack>
                    </Button>
                )}

                <Button
                    icon="logout"
                    style={{ paddingLeft: vars.space.md }}
                    color="error"
                    onClick={onLeaveClick}
                >
                    <Stack grow horizontal alignItems="center" gap="sm">
                        <Paragraph color="error">Leave {space?.name}</Paragraph>
                    </Stack>
                </Button>
            </Stack>

            <Stack grow padding paddingBottom="lg" justifyContent="end">
                <Stack horizontal justifyContent="spaceBetween" alignItems="center">
                    <Paragraph color="gray2" size="sm">
                        Toggle official TownNFT
                    </Paragraph>
                    <Toggle toggled={isOfficialNFTToggled} onToggle={onToggleOfficialNFT} />
                </Stack>
            </Stack>
        </Panel>
    )
}

const MotionStack = motion(Stack)
