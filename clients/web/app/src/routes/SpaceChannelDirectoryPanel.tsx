import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    RoomMember,
    createUserIdFromString,
    useChannelData,
    useChannelMembers,
} from 'use-zion-client'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Avatar, Box, Panel, Paragraph, Stack } from '@ui'
import { useLinkBuilder } from 'hooks/useLinkBuilder'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'

export const ChannelDirectoryPanel = () => {
    const { channel } = useChannelData()
    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('..')
    })

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel
                label={
                    <Stack horizontal gap="xs">
                        <>Members</>
                        {channel?.label && (
                            <span className={atoms({ color: 'default' })}>#{channel?.label}</span>
                        )}
                    </Stack>
                }
                onClose={onClose}
            >
                <ChannelMembers />
            </Panel>
        </Stack>
    )
}

const ChannelMembers = () => {
    const { members } = useChannelMembers()

    return (
        <Stack grow height="100%" overflow="scroll" paddingY="md">
            {members.map((m) => (
                <ChannelMemberRow key={m.userId} user={m} />
            ))}
        </Stack>
    )
}

const ChannelMemberRow = ({ user }: { user: RoomMember }) => {
    const isValid = !!user?.userId
    const link = useLinkBuilder({ profileId: user.userId })
    const userAddress = isValid ? createUserIdFromString(user.userId)?.accountAddress : undefined

    const navigate = useNavigate()
    const onNavigateClick = useCallback(() => {
        if (link) {
            navigate(link)
        }
    }, [link, navigate])
    if (!userAddress) {
        return null
    }

    return (
        <Stack
            horizontal
            paddingX="md"
            paddingY="sm"
            background={{ hover: 'level3', default: undefined }}
            cursor="pointer"
            onClick={onNavigateClick}
        >
            <Stack horizontal height="height_lg" gap="md">
                <Box centerContent>
                    <Avatar userId={user.userId} size="avatar_x4" />
                </Box>
                <Stack grow gap="paragraph">
                    <Paragraph color="default">{user.name}</Paragraph>
                    {userAddress && (
                        <ClipboardCopy
                            label={shortAddress(userAddress)}
                            clipboardContent={userAddress}
                        />
                    )}
                </Stack>
            </Stack>
        </Stack>
    )
}
