import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import useEvent from 'react-use-event-hook'
import {
    Permission,
    createUserIdFromEthereumAddress,
    useSpaceData,
    useSpaceMembers,
    useZionClient,
} from 'use-zion-client'
import { Link } from 'react-router-dom'
import { Avatar, Box, BoxProps, Button, ButtonText, Panel, Paragraph, Stack, Text } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { UploadImage } from '@components/UploadImage/UploadImage'
import { useHasPermission } from 'hooks/useHasPermission'
import { TextArea } from 'ui/components/TextArea/TextArea'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useGetSpaceTopic, useSetSpaceTopic } from 'hooks/useSpaceTopic'
import { useContractSpaceInfo } from '../hooks/useContractSpaceInfo'
import { useMatrixHomeServerUrl } from '../hooks/useMatrixHomeServerUrl'

const MdGap = ({ children, ...boxProps }: { children: JSX.Element } & BoxProps) => (
    <Box gap="md" {...boxProps}>
        {children}
    </Box>
)

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
            onError: () => {
                setEditErrorMessage("We weren't able to save your changes. Please try again later.")
            },
        })
    })

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel label="Space" onClose={onClose}>
                {space?.id && (
                    <Stack centerContent gap="lg" padding="lg">
                        <UploadImage
                            spaceName={space.name}
                            canEdit={Boolean(canEdit)}
                            spaceId={space.id.networkId}
                        />
                    </Stack>
                )}
                <Stack gap="lg" padding="lg">
                    <MdGap>
                        <Paragraph strong size="lg">
                            {space?.name}
                        </Paragraph>
                    </MdGap>

                    <MdGap>
                        <ClipboardCopy clipboardContent={address} label={shortAddress(address)} />
                    </MdGap>

                    {(canEdit || roomTopic) && (
                        <MdGap data-testid="about-section">
                            <>
                                <Box horizontal justifyContent="spaceBetween">
                                    <Paragraph strong>About</Paragraph>{' '}
                                    {canEdit &&
                                        (isEdit ? (
                                            <Box horizontal gap="sm">
                                                <Button
                                                    size="inline"
                                                    tone="none"
                                                    disabled={isLoading}
                                                    onClick={onCancel}
                                                >
                                                    <ButtonText color="error" size="sm">
                                                        Cancel
                                                    </ButtonText>
                                                </Button>
                                                <Box horizontal centerContent gap>
                                                    <Button
                                                        size="inline"
                                                        tone="none"
                                                        disabled={isLoading}
                                                        data-testid="save-button"
                                                        onClick={onSave}
                                                    >
                                                        <ButtonText color="gray1" size="sm">
                                                            Save
                                                        </ButtonText>
                                                    </Button>
                                                    {isLoading && <ButtonSpinner />}
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Button
                                                size="inline"
                                                tone="none"
                                                data-testid="edit-description-button"
                                                onClick={onEdit}
                                            >
                                                <ButtonText color="gray1" size="sm">
                                                    Edit
                                                </ButtonText>
                                            </Button>
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
                                                    src={matrixUserOwner.avatarUrl}
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
            </Panel>
        </Stack>
    )
}
