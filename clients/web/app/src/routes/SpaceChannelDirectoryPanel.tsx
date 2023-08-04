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
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { useCreateLink } from 'hooks/useCreateLink'
import { ModalContainer } from '@components/Modals/ModalContainer'

export const ChannelDirectoryPanel = () => {
    const { channel } = useChannelData()
    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('..')
    })

    return (
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
    )
}

const ChannelMembers = () => {
    const { members } = useChannelMembers()

    return (
        <Stack paddingY="md" minHeight="forceScroll">
            {members.map((m) => (
                <ChannelMemberRow key={m.userId} user={m} />
            ))}
        </Stack>
    )
}

export const ChannelMembersModal = (props: { onHide: () => void }) => {
    return (
        <ModalContainer touchTitle="Members" onHide={props.onHide}>
            <ChannelMembers />
        </ModalContainer>
    )
}

const ChannelMemberRow = ({ user }: { user: RoomMember }) => {
    const isValid = !!user?.userId
    const link = useCreateLink().createLink({ profileId: user.userId })
    let userAddress
    if (isValid) {
        userAddress = createUserIdFromString(user.userId)?.accountAddress
        //TODO: createUserIdFromString is tuned for Matrix - when we will substitute it with River version we should remove the if-statement below
        if (!userAddress) {
            userAddress = user.userId
        }
    }

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
