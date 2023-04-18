import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Permission,
    createUserIdFromEthereumAddress,
    useSpaceData,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast/headless'
import {
    Avatar,
    Box,
    BoxProps,
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
import { useContractSpaceInfo } from '../hooks/useContractSpaceInfo'
import { useMatrixHomeServerUrl } from '../hooks/useMatrixHomeServerUrl'

const MdGap = ({ children, ...boxProps }: { children: JSX.Element } & BoxProps) => (
    <Box gap="md" {...boxProps}>
        {children}
    </Box>
)

enum InputId {
    SpaceName = 'DisplayName',
}

export const SpaceInfoPanel = () => {
    const space = useSpaceData()
    const { client, chainId } = useZionClient()

    const { data } = useContractSpaceInfo(space?.id?.networkId)
    const address = data?.address ?? ''
    const navigate = useNavigate()
    const { data: canEdit } = useHasPermission(Permission.ModifySpaceSettings)

    const { homeserverUrl } = useMatrixHomeServerUrl()
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
        const _homeserverUrl = new URL(homeserverUrl || '')
        const userId = createUserIdFromEthereumAddress(
            data.owner,
            chainId,
        ).matrixUserIdLocalpart.toLowerCase()
        const matrixIdFromOwnerAddress = `@${userId}:${_homeserverUrl.hostname}`
        return client?.getUser(matrixIdFromOwnerAddress)
    }, [client, data?.owner, homeserverUrl, chainId])

    const { members } = useSpaceMembers()

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

    return (
        <Stack height="100%" overflow="hidden">
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
                <Stack gap="lg" paddingX="lg">
                    <MdGap>
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
                                    <Stack
                                        grow
                                        horizontal
                                        gap="sm"
                                        alignItems="start"
                                        minHeight="input_md"
                                    >
                                        {!isEditing ? (
                                            <Box grow gap="sm">
                                                <Box
                                                    horizontal
                                                    alignItems="center"
                                                    gap="xs"
                                                    height="x5"
                                                    onClick={
                                                        canEdit && !isEditing
                                                            ? handleEdit
                                                            : undefined
                                                    }
                                                >
                                                    <Paragraph strong size="lg">
                                                        {value}
                                                    </Paragraph>
                                                </Box>
                                                {address && (
                                                    <ClipboardCopy
                                                        label={shortAddress(address)}
                                                        clipboardContent={address}
                                                    />
                                                )}
                                            </Box>
                                        ) : (
                                            <Box grow horizontal gap>
                                                <Stack grow gap="sm">
                                                    <Stack>
                                                        <TextField
                                                            autoFocus
                                                            tone={error ? 'error' : undefined}
                                                            style={{
                                                                width: 0,
                                                                minWidth: '100%',
                                                            }} // shrink hack
                                                            background="level2"
                                                            value={value}
                                                            placeholder="Enter display name..."
                                                            height="x5"
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
                                                    {address && (
                                                        <ClipboardCopy
                                                            label={shortAddress(address)}
                                                            clipboardContent={address}
                                                        />
                                                    )}
                                                </Stack>
                                            </Box>
                                        )}
                                        <Box height="x5" justifyContent="center">
                                            {editMenu}
                                        </Box>
                                    </Stack>
                                </>
                            )}
                        </EditModeContainer>
                    </MdGap>

                    {(canEdit || roomTopic) && (
                        <MdGap data-testid="about-section">
                            <>
                                <Box horizontal justifyContent="spaceBetween">
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
                            <Paragraph strong>Population</Paragraph>
                            <Paragraph color="gray2">
                                {`${members.length} member${members.length > 1 ? `s` : ``}`}
                            </Paragraph>
                        </>
                    </MdGap>

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
        </Stack>
    )
}
