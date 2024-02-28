import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import {
    Address,
    RoomMember,
    useChannelData,
    useChannelMembers,
    useMyUserId,
    useUserLookupContext,
    useZionClient,
} from 'use-zion-client'
import { isGDMChannelStreamId } from '@river/sdk'
import Sheet from 'react-modal-sheet'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { Box, Button, Icon, Paragraph, Stack, Text } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { shortAddress } from 'ui/utils/utils'
import { useCreateLink } from 'hooks/useCreateLink'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Panel } from '@components/Panel/Panel'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { Avatar } from '@components/Avatar/Avatar'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { useDevice } from 'hooks/useDevice'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { TableCell } from '@components/TableCell/TableCell'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { ChannelInviteModal } from './ChannelInvitePanel'

export const ChannelDirectoryPanel = () => {
    const { channel } = useChannelData()
    const navigate = useNavigate()
    const { client } = useZionClient()

    const [pendingRemovalUserId, setPendingRemovalUserId] = React.useState<string | undefined>(
        undefined,
    )
    const canAddMembers = channel?.id ? isGDMChannelStreamId(channel.id) : false
    const onClose = useEvent(() => {
        navigate('..')
    })

    const canRemoveMembers = channel?.id ? isGDMChannelStreamId(channel.id) : false
    const onRemoveMember = useCallback(
        (userId: string) => {
            setPendingRemovalUserId(userId)
        },
        [setPendingRemovalUserId],
    )

    const onConfirmRemoveMember = useCallback(async () => {
        if (!pendingRemovalUserId) {
            return
        }
        if (!channel?.id) {
            return
        }
        await client?.removeUser(channel?.id, pendingRemovalUserId)
        setPendingRemovalUserId(undefined)
    }, [setPendingRemovalUserId, pendingRemovalUserId, channel?.id, client])

    const onCancelRemoveMember = useCallback(() => {
        setPendingRemovalUserId(undefined)
    }, [setPendingRemovalUserId])

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
            <ChannelMembers
                onAddMembersClick={canAddMembers ? addMembersClick : undefined}
                onRemoveMember={canRemoveMembers ? onRemoveMember : undefined}
            />
            {pendingRemovalUserId && (
                <ConfirmRemoveMemberModal
                    userId={pendingRemovalUserId}
                    onConfirm={onConfirmRemoveMember}
                    onCancel={onCancelRemoveMember}
                />
            )}
        </Panel>
    )
}

const ChannelMembers = (props: {
    onAddMembersClick?: () => void
    onRemoveMember?: (userId: string) => void
}) => {
    const { onAddMembersClick, onRemoveMember } = props
    const { memberIds } = useChannelMembers()
    const { usersMap } = useUserLookupContext()
    const myUserId = useMyUserId()

    return (
        <Stack paddingY="md" minHeight="forceScroll">
            {onAddMembersClick && <AddMemberRow onClick={onAddMembersClick} />}
            {memberIds.map((userId) => (
                <ChannelMemberRow
                    key={userId}
                    user={usersMap[userId]}
                    onRemoveMember={userId === myUserId ? undefined : onRemoveMember}
                />
            ))}
        </Stack>
    )
}

export const ChannelMembersModal = (props: { onHide: () => void }) => {
    const { channel } = useChannelData()
    const { client } = useZionClient()

    const canAddMembers = channel?.id ? isGDMChannelStreamId(channel.id) : false
    const canRemoveMembers = channel?.id ? isGDMChannelStreamId(channel.id) : false

    const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined)
    const [pendingRemovalUserId, setPendingRemovalUserId] = React.useState<string | undefined>(
        undefined,
    )
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const onAddMembersClick = useCallback(() => {
        setInviteModalOpen(true)
    }, [setInviteModalOpen])

    const onMemberClick = useCallback((userId: string) => {
        setSelectedUserId(userId)
    }, [])

    const onCloseMemberModal = useCallback(() => {
        setSelectedUserId(undefined)
    }, [])

    const onRemoveMemberClicked = useCallback(() => {
        if (selectedUserId) {
            setPendingRemovalUserId(selectedUserId)
        }
        setSelectedUserId(undefined)
    }, [setPendingRemovalUserId, selectedUserId, setSelectedUserId])

    const onConfirmRemoveMember = useCallback(async () => {
        if (!pendingRemovalUserId) {
            return
        }
        if (!channel?.id) {
            return
        }
        await client?.removeUser(channel?.id, pendingRemovalUserId)
        setPendingRemovalUserId(undefined)
    }, [setPendingRemovalUserId, pendingRemovalUserId, channel?.id, client])

    return (
        <>
            <ModalContainer touchTitle="Members" onHide={props.onHide}>
                <ChannelMembers
                    onAddMembersClick={canAddMembers ? onAddMembersClick : undefined}
                    onRemoveMember={canRemoveMembers ? onMemberClick : undefined}
                />
                {inviteModalOpen && <ChannelInviteModal onHide={() => setInviteModalOpen(false)} />}
                {selectedUserId && (
                    <UserModal
                        onClose={onCloseMemberModal}
                        onRemoveMemberClicked={onRemoveMemberClicked}
                    />
                )}

                {pendingRemovalUserId && (
                    <Box absoluteFill centerContent background="backdropBlur">
                        {/* This is a bit of a hack — the react-modal-sheet won't let us present a modal multiple sheets on top of each other. */}
                        <Box
                            padding
                            position="relative"
                            background="level1"
                            color="default"
                            rounded="sm"
                            border="level3"
                        >
                            <ConfirmRemoveMemberModalContent
                                userId={pendingRemovalUserId}
                                onConfirm={onConfirmRemoveMember}
                                onCancel={() => setPendingRemovalUserId(undefined)}
                            />
                        </Box>
                    </Box>
                )}
            </ModalContainer>
        </>
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

type ChannelMemberRowProps = {
    user: RoomMember
    onRemoveMember?: (userId: string) => void
}

const ChannelMemberRow = (props: ChannelMemberRowProps) => {
    const { user, onRemoveMember } = props
    const [isHeaderHovering, setIsHeaderHovering] = useState(false)
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: props.user.userId as Address | undefined,
    })
    const link = useCreateLink().createLink({ profileId: abstractAccountAddress })
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const onClick = useCallback(() => {
        if (isTouch) {
            onRemoveMember?.(user.userId)
        } else {
            if (link) {
                navigate(link)
            }
        }
    }, [link, navigate, user.userId, onRemoveMember, isTouch])

    const { usersMap } = useUserLookupContext()
    const globalUser = usersMap[user.userId] ?? user

    const onPointerEnter = useCallback(() => {
        setIsHeaderHovering(true)
    }, [])
    const onPointerLeave = useCallback(() => {
        setIsHeaderHovering(false)
    }, [])

    const onRemoveMemberClicked = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault()
            event.stopPropagation()
            if (onRemoveMember) {
                onRemoveMember(user.userId)
            }
        },
        [onRemoveMember, user.userId],
    )

    if (!abstractAccountAddress) {
        return null
    }

    return (
        <Stack
            horizontal
            paddingX="md"
            paddingY="sm"
            background={{ hover: 'level3', default: undefined }}
            cursor="pointer"
            alignItems="center"
            onClick={onClick}
            onPointerEnter={isTouch ? undefined : onPointerEnter}
            onPointerLeave={isTouch ? undefined : onPointerLeave}
        >
            <Stack horizontal height="height_lg" gap="md" width="100%">
                <Box
                    centerContent
                    tooltip={!isTouch ? <ProfileHoverCard userId={user.userId} /> : undefined}
                >
                    <Avatar userId={user.userId} size="avatar_x4" />
                </Box>
                <Stack grow gap="paragraph" overflow="hidden">
                    <Paragraph truncate color="default">
                        {getPrettyDisplayName(globalUser)}
                    </Paragraph>
                    {abstractAccountAddress && (
                        <ClipboardCopy
                            label={shortAddress(abstractAccountAddress)}
                            clipboardContent={abstractAccountAddress}
                        />
                    )}
                </Stack>
            </Stack>
            {onRemoveMember && isHeaderHovering && (
                <Box tooltip="Remove from group">
                    <Button tone="none" color="gray2" size="inline" onClick={onRemoveMemberClicked}>
                        <Icon type="minus" />
                    </Button>
                </Box>
            )}
        </Stack>
    )
}

type ConfirmRemoveMemberModalProps = {
    onConfirm: () => void
    onCancel: () => void
    userId: string
}

const ConfirmRemoveMemberModal = (props: ConfirmRemoveMemberModalProps) => {
    const { onCancel } = props
    return (
        <ModalContainer minWidth="auto" onHide={onCancel}>
            <ConfirmRemoveMemberModalContent {...props} />
        </ModalContainer>
    )
}

const ConfirmRemoveMemberModalContent = (props: ConfirmRemoveMemberModalProps) => {
    const { onConfirm, onCancel } = props
    const { userId } = props
    const { usersMap } = useUserLookupContext()
    const user = usersMap[userId]

    if (!user) {
        return null
    }
    const name = getPrettyDisplayName(user)
    return (
        <Stack padding="sm" gap="lg" width="300">
            <Text fontWeight="strong">Remove {name} from this group</Text>
            <Text>Are you sure you sure you want to remove {name} from this group?</Text>
            <Stack horizontal gap width="100%">
                <Box grow />

                <Button tone="level2" onClick={onCancel}>
                    Cancel
                </Button>
                <Button tone="negative" color="default" onClick={onConfirm}>
                    Remove
                </Button>
            </Stack>
        </Stack>
    )
}

const UserModal = (props: { onClose: () => void; onRemoveMemberClicked: () => void }) => {
    const [isOpen, setIsOpen] = useState(false)
    const { onClose, onRemoveMemberClicked } = props
    useEffect(() => {
        setIsOpen(true)
    }, [])

    const closeSheet = useCallback(() => {
        setIsOpen(false)
        setTimeout(() => {
            onClose()
        }, 300)
    }, [setIsOpen, onClose])

    return (
        <Sheet
            isOpen={isOpen}
            className={modalSheetClass}
            detent="content-height"
            onClose={closeSheet}
        >
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <Stack paddingX="sm" paddingBottom="lg" alignContent="start" gap="sm">
                        <TableCell
                            isError
                            iconType="minus"
                            text="Remove from Group"
                            onClick={onRemoveMemberClicked}
                        />
                    </Stack>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={closeSheet} />
        </Sheet>
    )
}
