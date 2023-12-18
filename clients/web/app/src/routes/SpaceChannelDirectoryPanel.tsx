import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    RoomMember,
    getAccountAddress,
    useChannelData,
    useChannelMembers,
    useUserLookupContext,
} from 'use-zion-client'
import { isGDMChannelStreamId } from '@river/sdk'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Box, Icon, Paragraph, Stack } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { useCreateLink } from 'hooks/useCreateLink'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Panel } from '@components/Panel/Panel'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { ChannelInviteModal } from './ChannelInvitePanel'

export const ChannelDirectoryPanel = () => {
    const { channel } = useChannelData()
    const navigate = useNavigate()

    const canAddMembers = channel?.id ? isGDMChannelStreamId(channel.id.streamId) : false
    const onClose = useEvent(() => {
        navigate('..')
    })

    const addMembersClick = useCallback(() => {
        navigate(`../${CHANNEL_INFO_PARAMS.INFO}?${CHANNEL_INFO_PARAMS.INVITE}`)
    }, [navigate])

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
            <ChannelMembers onAddMembersClick={canAddMembers ? addMembersClick : undefined} />
        </Panel>
    )
}

const ChannelMembers = (props: { onAddMembersClick?: () => void }) => {
    const { onAddMembersClick } = props
    const { memberIds } = useChannelMembers()
    const { usersMap } = useUserLookupContext()

    return (
        <Stack paddingY="md" minHeight="forceScroll">
            {onAddMembersClick && <AddMemberRow onClick={onAddMembersClick} />}
            {memberIds.map((userId) => (
                <ChannelMemberRow key={userId} user={usersMap[userId]} />
            ))}
        </Stack>
    )
}

export const ChannelMembersModal = (props: { onHide: () => void }) => {
    const { channel } = useChannelData()
    const canAddMembers = channel?.id ? isGDMChannelStreamId(channel.id.streamId) : false
    const [inviteModalOpen, setInviteModalOpen] = React.useState(false)
    const onAddMembersClick = useCallback(() => {
        setInviteModalOpen(true)
    }, [setInviteModalOpen])

    return (
        <ModalContainer touchTitle="Members" onHide={props.onHide}>
            <ChannelMembers onAddMembersClick={canAddMembers ? onAddMembersClick : undefined} />
            {inviteModalOpen && <ChannelInviteModal onHide={() => setInviteModalOpen(false)} />}
        </ModalContainer>
    )
}

const AddMemberRow = (props: { onClick: () => void }) => {
    const { onClick } = props
    return (
        <Stack
            horizontal
            paddingX="md"
            paddingY="sm"
            background={{ hover: 'level3', default: undefined }}
            cursor="pointer"
            onClick={onClick}
        >
            <Stack horizontal height="height_lg" gap="md" width="100%" alignItems="center">
                <Box centerContent background="level3" width="x4" height="x4" rounded="full">
                    <Icon type="personAdd" size="square_xs" color="default" />
                </Box>
                <Stack grow gap="paragraph" overflow="hidden">
                    Add members
                </Stack>
            </Stack>
        </Stack>
    )
}

const ChannelMemberRow = ({ user }: { user: RoomMember }) => {
    const isValid = !!user?.userId
    const link = useCreateLink().createLink({ profileId: user.userId })
    let userAddress
    if (isValid) {
        userAddress = getAccountAddress(user.userId)
    }

    const navigate = useNavigate()
    const onNavigateClick = useCallback(() => {
        if (link) {
            navigate(link)
        }
    }, [link, navigate])

    const { usersMap } = useUserLookupContext()
    const globalUser = usersMap[user.userId] ?? user

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
            <Stack horizontal height="height_lg" gap="md" width="100%">
                <Box centerContent>
                    <Avatar userId={user.userId} size="avatar_x4" />
                </Box>
                <Stack grow gap="paragraph" overflow="hidden">
                    <Paragraph truncate color="default">
                        {getPrettyDisplayName(globalUser).displayName}
                    </Paragraph>
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
