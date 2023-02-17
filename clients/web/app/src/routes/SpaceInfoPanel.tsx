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
import { randParagraph } from '@ngneat/falso'
import { Avatar, Box, BoxProps, Button, ButtonText, Panel, Paragraph, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { UploadImage } from '@components/UploadImage/UploadImage'
import { useHasPermission } from 'hooks/useHasPermission'
import { TextArea } from 'ui/components/TextArea/TextArea'
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
    const { data: isOwner } = useHasPermission(Permission.Owner)
    const { homeserverUrl } = useMatrixHomeServerUrl()
    const [isEdit, setIsEdit] = useState(false)
    const [description, setDescription] = useState(randParagraph())
    const textAreaRef = useRef<HTMLTextAreaElement>(null)

    const matrixUserOwner = useMemo(() => {
        if (!client?.matrixClient || !data?.owner || !chainId) {
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
        setTimeout(() => {
            textAreaRef.current?.focus()
        })
    })
    const onCancel = useEvent(() => setIsEdit(false))
    const onSave = useEvent(() => {
        console.log('save')
        if (!textAreaRef.current) {
            return
        }
        setDescription(textAreaRef.current.value)
        setIsEdit(false)
    })

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel label="Space" onClose={onClose}>
                {space?.id && (
                    <Stack centerContent gap="lg" padding="lg">
                        <UploadImage
                            spaceName={space.name}
                            isOwner={Boolean(isOwner)}
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

                    <MdGap>
                        <>
                            <Box horizontal justifyContent="spaceBetween">
                                <Paragraph strong>About</Paragraph>{' '}
                                {/* TODO: update for proper role */}
                                {isOwner &&
                                    (isEdit ? (
                                        <Box horizontal gap="sm">
                                            <Button size="inline" tone="none" onClick={onCancel}>
                                                <ButtonText color="cta1" size="sm">
                                                    Cancel
                                                </ButtonText>
                                            </Button>
                                            <Button size="inline" tone="none" onClick={onSave}>
                                                <ButtonText color="gray1" size="sm">
                                                    Save
                                                </ButtonText>
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Button size="inline" tone="none" onClick={onEdit}>
                                            <ButtonText color="gray1" size="sm">
                                                Edit
                                            </ButtonText>
                                        </Button>
                                    ))}
                            </Box>
                            {isEdit ? (
                                <TextArea
                                    ref={textAreaRef}
                                    paddingY="md"
                                    background="level2"
                                    defaultValue={description}
                                    height="150"
                                    maxLength={400}
                                    style={{ paddingRight: '2.5rem' }}
                                />
                            ) : (
                                <Paragraph color="gray2">{description}</Paragraph>
                            )}
                        </>
                    </MdGap>

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
