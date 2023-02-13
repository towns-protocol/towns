import React, { useMemo } from 'react'
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
import { Avatar, Box, Panel, Paragraph, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { UploadImage } from '@components/UploadImage/UploadImage'
import { useHasPermission } from 'hooks/useHasPermission'
import { useContractSpaceInfo } from '../hooks/useContractSpaceInfo'
import { useMatrixHomeServerUrl } from '../hooks/useMatrixHomeServerUrl'

const MdGap = ({ children }: { children: JSX.Element }) => <Box gap="md">{children}</Box>

export const SpaceInfoPanel = () => {
    const space = useSpaceData()
    const { client, chainId } = useZionClient()

    const { data } = useContractSpaceInfo(space?.id?.networkId)
    const address = data?.address ?? ''
    const navigate = useNavigate()
    const isOwner = useHasPermission(Permission.Owner)
    const { homeserverUrl } = useMatrixHomeServerUrl()

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
