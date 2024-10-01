import { isGDMChannelStreamId } from '@river-build/sdk'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Sheet } from 'react-modal-sheet'
import {
    Address,
    useChannelData,
    useChannelId,
    useMyUserId,
    useTownsClient,
    useUserLookupContext,
} from 'use-towns-client'
import { Avatar } from '@components/Avatar/Avatar'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { NoMatches } from '@components/NoMatches/NoMatches'
import { Panel } from '@components/Panel/Panel'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { TableCell } from '@components/TableCell/TableCell'
import { Box, Button, Icon, Paragraph, Stack, Text, TextField } from '@ui'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { useDevice } from 'hooks/useDevice'
import { useFuzzySearchByProperty } from 'hooks/useFuzzySearchByProperty'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { atoms } from 'ui/styles/atoms.css'
import { modalSheetClass } from 'ui/styles/globals/sheet.css'
import { shortAddress } from 'ui/utils/utils'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useChannelHeaderMembers } from 'hooks/useChannelHeaderMembers'
import { ChannelInviteModal } from '../../routes/ChannelInvitePanel'
import { usePanelActions } from '../../routes/layouts/hooks/usePanelActions'

export const ChannelMembersPanel = () => {
    const { channel } = useChannelData()
    const { client } = useTownsClient()

    const [pendingRemovalUserId, setPendingRemovalUserId] = React.useState<string | undefined>(
        undefined,
    )
    const canAddMembers = channel?.id ? isGDMChannelStreamId(channel.id) : false

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
            padding="none"
            gap="none"
        >
            <ChannelMembers
                canAddMembers={canAddMembers}
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
    canAddMembers: boolean
    onAddMembersClick?: () => void
    onRemoveMember?: (userId: string) => void
}) => {
    const { canAddMembers, onRemoveMember } = props
    const channelId = useChannelId()
    const memberIds = useChannelHeaderMembers(channelId)
    const myUserId = useMyUserId()
    const { openPanel } = usePanelActions()
    const { lookupUser } = useUserLookupContext()

    const addMembersClick = useCallback(() => {
        if (props.onAddMembersClick) {
            // only for touch / modal
            props.onAddMembersClick()
        } else {
            openPanel(CHANNEL_INFO_PARAMS.INVITE)
        }
    }, [openPanel, props])

    const membersWithNames = useMemo(() => {
        return memberIds.map((userId) => {
            const user = lookupUser(userId)
            return {
                userId,
                name: getPrettyDisplayName(user),
            }
        })
    }, [memberIds, lookupUser])

    const {
        searchText,
        filteredItems: filteredMembers,
        handleSearchChange,
    } = useFuzzySearchByProperty(membersWithNames)

    return (
        <>
            <Box
                padding
                paddingBottom="none"
                height="x8"
                position="fixed"
                width="100%"
                zIndex="above"
                insetBottom="xs"
            >
                <Box
                    background="level1"
                    height="x7"
                    top="none"
                    left="none"
                    position="absolute"
                    width="100%"
                />
                <TextField
                    background="level2"
                    placeholder="Search members"
                    value={searchText}
                    onChange={handleSearchChange}
                />
            </Box>
            <Box minHeight="x9" />

            {canAddMembers && <AddMemberRow onClick={addMembersClick} />}

            {(filteredMembers?.length > 0 ? filteredMembers : membersWithNames).map(
                ({ userId }) => (
                    <ChannelMemberRow
                        key={userId}
                        userId={userId}
                        onRemoveMember={userId === myUserId ? undefined : onRemoveMember}
                    />
                ),
            )}
            {filteredMembers.length === 0 && (
                <Box paddingX>
                    <NoMatches searchTerm={searchText} />
                </Box>
            )}
        </>
    )
}

export const ChannelMembersModal = (props: { onHide: () => void }) => {
    const { channel } = useChannelData()
    const { client } = useTownsClient()

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
                    canAddMembers={canAddMembers}
                    onAddMembersClick={onAddMembersClick}
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
    userId: string
    onRemoveMember?: (userId: string) => void
}

const ChannelMemberRow = (props: ChannelMemberRowProps) => {
    const { userId, onRemoveMember } = props
    const [isHeaderHovering, setIsHeaderHovering] = useState(false)
    const { lookupUser } = useUserLookupContext()
    const user = lookupUser(userId)
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address | undefined,
    })
    const { openPanel } = usePanelActions()
    const { isTouch } = useDevice()
    const onClick = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.PROFILE, { profileId: abstractAccountAddress })
    }, [openPanel, abstractAccountAddress])

    const globalUser = lookupUser(userId) ?? user

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
                onRemoveMember(userId)
            }
        },
        [onRemoveMember, userId],
    )

    if (!abstractAccountAddress) {
        return null
    }

    return (
        <Stack paddingX="sm">
            <Stack
                horizontal
                borderRadius="xs"
                paddingX="sm"
                paddingY="sm"
                background={{ hover: 'level2', default: undefined }}
                cursor="pointer"
                alignItems="center"
                onClick={onClick}
                onPointerEnter={isTouch ? undefined : onPointerEnter}
                onPointerLeave={isTouch ? undefined : onPointerLeave}
            >
                <Stack horizontal gap width="100%">
                    <Box
                        centerContent
                        tooltip={!isTouch ? <ProfileHoverCard userId={userId} /> : undefined}
                    >
                        <Avatar userId={userId} size="avatar_x4" />
                    </Box>
                    <Stack grow gap="paragraph" overflow="hidden" paddingY="xs" insetY="xxs">
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
                        <Button
                            tone="none"
                            color="gray2"
                            size="inline"
                            onClick={onRemoveMemberClicked}
                        >
                            <Icon type="minus" />
                        </Button>
                    </Box>
                )}
            </Stack>
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
    const { lookupUser } = useUserLookupContext()
    const user = lookupUser(userId)

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
                    <Sheet.Scroller>
                        <Stack paddingX="sm" paddingBottom="lg" alignContent="start" gap="sm">
                            <TableCell
                                isError
                                iconType="minus"
                                text="Remove from Group"
                                onClick={onRemoveMemberClicked}
                            />
                        </Stack>
                    </Sheet.Scroller>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={closeSheet} />
        </Sheet>
    )
}
