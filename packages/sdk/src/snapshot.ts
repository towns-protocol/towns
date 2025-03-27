import {
    Snapshot,
    StreamEvent,
    SpacePayload,
    ChannelPayload,
    DmChannelPayload,
    GdmChannelPayload,
    UserPayload,
    UserSettingsPayload,
    UserMetadataPayload,
    UserInboxPayload,
    MemberPayload,
    SpacePayload_ChannelMetadataSchema,
    ChannelOp,
    SpacePayload_ChannelSettingsSchema,
    SpacePayload_SnappedSpaceImageSchema,
    MemberPayload_SnappedPinSchema,
    WrappedEncryptedDataSchema,
    MembershipOp,
    MemberPayload_Snapshot_MemberSchema,
    type UserInboxPayload_Snapshot,
    UserInboxPayload_Snapshot_DeviceSummarySchema,
    UserSettingsPayload_Snapshot_UserBlocks_BlockSchema,
    UserSettingsPayload_Snapshot_UserBlocksSchema,
} from '@towns-protocol/proto'
import { create } from '@bufbuild/protobuf'
import { isDefaultChannelId, streamIdFromBytes } from './id'
import { bin_toHexString } from '@towns-protocol/dlog'
import { logNever } from './check'

export type SnapshotUpdateFn = (snapshot: Snapshot, miniblockNum: bigint, eventNum: bigint) => void

/**
 * Mutates the snapshot with the given event.
 * @param rawSnapshot - The raw snapshot to update.
 * @param event - The event to update the snapshot with.
 * @param eventHash - The hash of the event.
 * @param miniblockNum - The miniblock number of the event.
 * @param eventNum - The event number of the event.
 */
export function updateSnapshot(event: StreamEvent, eventHash: Uint8Array) {
    // const snapshot = migrateSnapshot(rawSnapshot) // TODO: do we to migrate here?
    if (!event.payload.case || !event.payload.value) {
        return undefined
    }

    switch (event.payload.case) {
        case 'spacePayload':
            return updateSnapshotSpace(event.payload.value, event.creatorAddress, eventHash)

        case 'channelPayload':
            return updateSnapshotChannel(event.payload.value)

        case 'dmChannelPayload':
            return updateSnapshotDmChannel(event.payload.value)

        case 'gdmChannelPayload':
            return updateSnapshotGdmChannel(event.payload.value, eventHash)

        case 'userPayload':
            return updateSnapshotUser(event.payload.value)

        case 'userSettingsPayload':
            return updateSnapshotUserSettings(event.payload.value)

        case 'userMetadataPayload':
            return updateSnapshotUserMetadata(event.payload.value, eventHash)

        case 'userInboxPayload':
            return updateSnapshotUserInbox(event.payload.value)

        case 'memberPayload':
            return updateSnapshotMember(event.payload.value, event.creatorAddress, eventHash)

        case 'mediaPayload':
            return undefined

        case undefined:
            return undefined

        case 'miniblockHeader':
            return undefined

        default:
            logNever(event.payload, 'Unknown payload type')
            return undefined
    }
}

function updateSnapshotSpace(
    spacePayload: SpacePayload,
    creatorAddress: Uint8Array,
    eventHash: Uint8Array,
): SnapshotUpdateFn | undefined {
    const getContent = (snapshot: Snapshot) => {
        if (!snapshot.content.case || snapshot.content.case !== 'spaceContent') {
            throw new Error('Snapshot is not a space snapshot')
        }
        return snapshot.content.value
    }

    switch (spacePayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined

        case 'channel': {
            const value = spacePayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const spaceContent = getContent(snapshot)
                const channel = create(SpacePayload_ChannelMetadataSchema, {
                    channelId: value.channelId,
                    op: value.op,
                    originEvent: value.originEvent,
                    updatedAtEventNum: eventNum,
                    settings: value.settings || {
                        autojoin: false,
                        hideUserJoinLeaveEvents: false,
                    },
                })

                if (!channel.settings) {
                    if (channel.op === ChannelOp.CO_CREATED) {
                        channel.settings = create(SpacePayload_ChannelSettingsSchema, {
                            autojoin: isDefaultChannelId(streamIdFromBytes(channel.channelId)),
                            hideUserJoinLeaveEvents: false,
                        })
                    } else if (channel.op === ChannelOp.CO_UPDATED) {
                        const existingChannel = spaceContent.channels.find((c) =>
                            areBuffersEqual(c.channelId, channel.channelId),
                        )
                        if (!existingChannel) {
                            throw new Error('Channel not found')
                        }
                        channel.settings = existingChannel.settings
                    }
                }

                // Update or insert channel
                const channelIndex = spaceContent.channels.findIndex((c) =>
                    areBuffersEqual(c.channelId, channel.channelId),
                )

                if (channelIndex >= 0) {
                    spaceContent.channels[channelIndex] = channel
                } else {
                    spaceContent.channels.push(channel)
                }
            }
        }

        case 'spaceImage':
            const value = spacePayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const spaceContent = getContent(snapshot)
                spaceContent.spaceImage = create(SpacePayload_SnappedSpaceImageSchema, {
                    creatorAddress,
                    data: value,
                    eventNum,
                    eventHash,
                })
            }

        case 'updateChannelAutojoin': {
            const value = spacePayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const spaceContent = getContent(snapshot)
                // argh, we need to update TS 5.5 to get better infer
                const channelId =
                    spacePayload.content.case === 'updateChannelAutojoin'
                        ? spacePayload.content.value.channelId
                        : new Uint8Array()
                const channel = spaceContent.channels.find((c) =>
                    areBuffersEqual(c.channelId, channelId),
                )
                if (!channel) {
                    throw new Error('Channel not found')
                }
                if (!channel.settings) {
                    channel.settings = create(SpacePayload_ChannelSettingsSchema, {
                        autojoin: false,
                        hideUserJoinLeaveEvents: false,
                    })
                }
                channel.settings.autojoin = value.autojoin
            }
        }

        case 'updateChannelHideUserJoinLeaveEvents': {
            const value = spacePayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const spaceContent = getContent(snapshot)
                const channelId =
                    spacePayload.content.case === 'updateChannelHideUserJoinLeaveEvents'
                        ? spacePayload.content.value.channelId
                        : new Uint8Array()
                const channel = spaceContent.channels.find((c) =>
                    areBuffersEqual(c.channelId, channelId),
                )
                if (!channel) {
                    throw new Error('Channel not found')
                }
                if (!channel.settings) {
                    channel.settings = create(SpacePayload_ChannelSettingsSchema, {
                        autojoin: false,
                        hideUserJoinLeaveEvents: false,
                    })
                }
                channel.settings.hideUserJoinLeaveEvents = value.hideUserJoinLeaveEvents
            }
        }

        default:
            logNever(spacePayload.content, 'Unknown space payload content type')
            return undefined
    }
}

function updateSnapshotChannel(channelPayload: ChannelPayload): SnapshotUpdateFn | undefined {
    switch (channelPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            // new Error('Cannot update snapshot with inception event')
            return undefined
        case 'message':
            return undefined
        case 'redaction':
            return undefined
        default:
            logNever(channelPayload.content, 'Unknown channel payload content type')
            return undefined
    }
}

function updateSnapshotDmChannel(dmChannelPayload: DmChannelPayload): SnapshotUpdateFn | undefined {
    switch (dmChannelPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined
        case 'message':
            return undefined
        default:
            logNever(dmChannelPayload.content, 'Unknown DM channel payload content type')
            return undefined
    }
}

function updateSnapshotGdmChannel(
    gdmChannelPayload: GdmChannelPayload,
    eventHash: Uint8Array,
): SnapshotUpdateFn | undefined {
    const getContent = (snapshot: Snapshot) => {
        if (!snapshot.content.case || snapshot.content.case !== 'gdmChannelContent') {
            throw new Error('Snapshot is not a GDM channel snapshot')
        }
        return snapshot.content.value
    }

    switch (gdmChannelPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined
        case 'channelProperties':
            const value = gdmChannelPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const gdmContent = getContent(snapshot)
                gdmContent.channelProperties = create(WrappedEncryptedDataSchema, {
                    data: value,
                    eventNum,
                    eventHash,
                })
            }
        case 'message':
            return
        default:
            logNever(gdmChannelPayload.content, 'Unknown GDM channel payload content type')
            return undefined
    }
}

function updateSnapshotUser(userPayload: UserPayload): SnapshotUpdateFn | undefined {
    const getContent = (snapshot: Snapshot) => {
        if (!snapshot.content.case || snapshot.content.case !== 'userContent') {
            throw new Error('Snapshot is not a user snapshot')
        }
        return snapshot.content.value
    }

    switch (userPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined

        case 'userMembership': {
            const value = userPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const userContent = getContent(snapshot)
                // Insert or update membership
                const streamId = value.streamId
                const membershipIndex = userContent.memberships.findIndex((m) =>
                    areBuffersEqual(m.streamId, streamId),
                )
                if (membershipIndex >= 0) {
                    userContent.memberships[membershipIndex] = value
                } else {
                    userContent.memberships.push(value)
                }
            }
        }

        case 'userMembershipAction':
            return

        case 'blockchainTransaction': {
            const value = userPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const userContent = getContent(snapshot)
                switch (value.content.case) {
                    case undefined:
                        break
                    case 'tip': {
                        if (!userContent.tipsSent) {
                            userContent.tipsSent = {}
                        }
                        const currency = bin_toHexString(
                            value.content.value.event?.currency || new Uint8Array(),
                        )
                        if (!userContent.tipsSent[currency]) {
                            userContent.tipsSent[currency] = 0n
                        }
                        userContent.tipsSent[currency] += value.content.value.event?.amount || 0n
                        break
                    }
                    case 'tokenTransfer':
                        break
                    case 'spaceReview':
                        break
                    default:
                        logNever(value.content, 'Unknown blockchain transaction content type')
                        break
                }
            }
        }

        case 'receivedBlockchainTransaction': {
            const value = userPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const userContent = getContent(snapshot)
                if (!value.transaction) {
                    return
                }
                switch (value.transaction.content.case) {
                    case undefined:
                        break
                    case 'tip': {
                        if (!userContent.tipsReceived) {
                            userContent.tipsReceived = {}
                        }
                        const currency = bin_toHexString(
                            value.transaction.content.value.event?.currency || new Uint8Array(),
                        )
                        if (!userContent.tipsReceived[currency]) {
                            userContent.tipsReceived[currency] = 0n
                        }
                        userContent.tipsReceived[currency] +=
                            value.transaction.content.value.event?.amount || 0n
                        break
                    }
                    case 'tokenTransfer':
                        break
                    case 'spaceReview':
                        break
                    default:
                        logNever(
                            value.transaction.content,
                            'Unknown received blockchain transaction content type',
                        )
                        break
                }
            }
        }

        default:
            logNever(userPayload.content, 'Unknown user payload content type')
            return undefined
    }
}

function updateSnapshotUserSettings(
    userSettingsPayload: UserSettingsPayload,
): SnapshotUpdateFn | undefined {
    const getContent = (snapshot: Snapshot) => {
        if (!snapshot.content.case || snapshot.content.case !== 'userSettingsContent') {
            throw new Error('Snapshot is not a user settings snapshot')
        }
        return snapshot.content.value
    }

    switch (userSettingsPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined

        case 'fullyReadMarkers': {
            const value = userSettingsPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const settingsContent = getContent(snapshot)
                const markerIndex = settingsContent.fullyReadMarkers.findIndex((m) =>
                    areBuffersEqual(m.streamId, value.streamId),
                )
                if (markerIndex >= 0) {
                    settingsContent.fullyReadMarkers[markerIndex] = value
                } else {
                    settingsContent.fullyReadMarkers.push(value)
                }
            }
        }

        case 'userBlock': {
            const value = userSettingsPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const settingsContent = getContent(snapshot)
                const userBlocks = settingsContent.userBlocksList.find((ub) =>
                    areBuffersEqual(ub.userId, value.userId),
                )

                if (userBlocks) {
                    userBlocks.blocks.push(
                        create(UserSettingsPayload_Snapshot_UserBlocks_BlockSchema, {
                            isBlocked: value.isBlocked,
                            eventNum: value.eventNum,
                        }),
                    )
                } else {
                    settingsContent.userBlocksList.push(
                        create(UserSettingsPayload_Snapshot_UserBlocksSchema, {
                            userId: value.userId,
                            blocks: [
                                {
                                    isBlocked: value.isBlocked,
                                    eventNum: value.eventNum,
                                },
                            ],
                        }),
                    )
                }
            }
        }

        default:
            logNever(userSettingsPayload.content, 'Unknown user settings payload content type')
            return undefined
    }
}

function updateSnapshotUserMetadata(
    userMetadataPayload: UserMetadataPayload,
    eventHash: Uint8Array,
): SnapshotUpdateFn | undefined {
    const getContent = (snapshot: Snapshot) => {
        if (!snapshot.content.case || snapshot.content.case !== 'userMetadataContent') {
            throw new Error('Snapshot is not a user metadata snapshot')
        }
        return snapshot.content.value
    }

    switch (userMetadataPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined

        case 'encryptionDevice': {
            const device = userMetadataPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const metadataContent = getContent(snapshot)
                if (!metadataContent.encryptionDevices) {
                    metadataContent.encryptionDevices = []
                }

                // Remove existing device if present
                const devices = metadataContent.encryptionDevices.filter(
                    (d) => d.deviceKey !== device.deviceKey,
                )

                // Add new device, keeping max 10 devices
                const MAX_DEVICES = 10
                const startIndex = Math.max(0, devices.length - MAX_DEVICES + 1)
                metadataContent.encryptionDevices = [...devices.slice(startIndex), device]
            }
        }

        case 'profileImage': {
            const value = userMetadataPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const metadataContent = getContent(snapshot)
                metadataContent.profileImage = create(WrappedEncryptedDataSchema, {
                    data: value,
                    eventNum,
                    eventHash,
                })
            }
        }

        case 'bio': {
            const value = userMetadataPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const metadataContent = getContent(snapshot)
                metadataContent.bio = create(WrappedEncryptedDataSchema, {
                    data: value,
                    eventNum,
                    eventHash,
                })
            }
        }

        default:
            logNever(userMetadataPayload.content, 'Unknown user metadata payload content type')
            return undefined
    }
}

function updateSnapshotUserInbox(userInboxPayload: UserInboxPayload): SnapshotUpdateFn | undefined {
    const getContent = (snapshot: Snapshot) => {
        if (!snapshot.content.case || snapshot.content.case !== 'userInboxContent') {
            throw new Error('Snapshot is not a user inbox snapshot')
        }
        return snapshot.content.value
    }

    switch (userInboxPayload.content.case) {
        case undefined:
            return undefined
        case 'inception':
            return undefined

        case 'groupEncryptionSessions': {
            const value = userInboxPayload.content.value
            return (snapshot: Snapshot, miniblockNum: bigint, _eventNum: bigint) => {
                const inboxContent = getContent(snapshot)
                if (!inboxContent.deviceSummary) {
                    inboxContent.deviceSummary = {}
                }

                // Update device summaries
                for (const deviceKey in value.ciphertexts) {
                    if (inboxContent.deviceSummary[deviceKey]) {
                        inboxContent.deviceSummary[deviceKey].upperBound = miniblockNum
                    } else {
                        inboxContent.deviceSummary[deviceKey] = create(
                            UserInboxPayload_Snapshot_DeviceSummarySchema,
                            {
                                lowerBound: miniblockNum,
                                upperBound: miniblockNum,
                            },
                        )
                    }
                }

                cleanupSnapshotUserInbox(inboxContent, miniblockNum)
            }
        }

        case 'ack': {
            const value = userInboxPayload.content.value
            return (snapshot: Snapshot, miniblockNum: bigint, _eventNum: bigint) => {
                const inboxContent = getContent(snapshot)
                if (!inboxContent.deviceSummary) {
                    return
                }

                const deviceKey = value.deviceKey
                const summary = inboxContent.deviceSummary[deviceKey]

                if (summary) {
                    if (summary.upperBound <= value.miniblockNum) {
                        delete inboxContent.deviceSummary[deviceKey]
                    } else {
                        summary.lowerBound = value.miniblockNum + 1n
                    }
                }

                cleanupSnapshotUserInbox(inboxContent, miniblockNum)
            }
        }

        default:
            logNever(userInboxPayload.content, 'Unknown user inbox payload content type')
            return undefined
    }
}

function cleanupSnapshotUserInbox(
    inboxContent: UserInboxPayload_Snapshot,
    currentminiblockNum: bigint,
): void {
    const maxGenerations = 3600n // ~5 days of blocks at 2 second intervals
    const currentBlock = currentminiblockNum

    if (inboxContent.deviceSummary) {
        for (const [deviceKey, summary] of Object.entries(inboxContent.deviceSummary)) {
            const isOlderThanMaxGenerations = currentBlock - summary.lowerBound > maxGenerations
            if (isOlderThanMaxGenerations) {
                delete inboxContent.deviceSummary[deviceKey]
            }
        }
    }
}

function updateSnapshotMember(
    memberPayload: MemberPayload,
    creatorAddress: Uint8Array,
    eventHash: Uint8Array,
): SnapshotUpdateFn | undefined {
    switch (memberPayload.content.case) {
        case undefined:
            return undefined
        case 'membership': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const membership = value
                switch (membership.op) {
                    // SO_JOIN
                    case MembershipOp.SO_JOIN: {
                        const joinedMember = create(MemberPayload_Snapshot_MemberSchema, {
                            userAddress: membership.userAddress,
                            miniblockNum,
                            eventNum,
                            solicitations: [],
                        })

                        const joinedIndex = snapshot.members.joined.findIndex((m) =>
                            areBuffersEqual(m.userAddress, membership.userAddress),
                        )

                        if (joinedIndex >= 0) {
                            snapshot.members.joined[joinedIndex] = joinedMember
                        } else {
                            snapshot.members.joined.push(joinedMember)
                        }
                        return
                    }

                    case MembershipOp.SO_LEAVE:
                        snapshot.members.joined = snapshot.members.joined.filter(
                            (m) => !areBuffersEqual(m.userAddress, membership.userAddress),
                        )
                        return

                    case MembershipOp.SO_INVITE:
                        return // Not tracking invites

                    default:
                        return new Error(`Unknown membership op ${membership.op}`)
                }
            }
        }

        case 'keySolicitation': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = snapshot.members.joined.find((m) =>
                    areBuffersEqual(m.userAddress, creatorAddress),
                )
                if (!member) {
                    return
                }

                member.solicitations = member.solicitations.filter(
                    (s) => s.deviceKey !== value.deviceKey,
                )

                const MAX_DEVICES = 10
                const startIndex = Math.max(0, member.solicitations.length - MAX_DEVICES + 1)
                member.solicitations = [...member.solicitations.slice(startIndex), value]
            }
        }

        case 'keyFulfillment': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = snapshot.members.joined.find((m) =>
                    areBuffersEqual(m.userAddress, value.userAddress),
                )
                if (!member) {
                    return
                }

                const solicitation = member.solicitations.find(
                    (s) => s.deviceKey === value.deviceKey,
                )
                if (solicitation) {
                    solicitation.sessionIds = solicitation.sessionIds.filter(
                        (id) => !value.sessionIds.includes(id),
                    )
                    solicitation.isNewDevice = false
                }
            }
        }

        case 'displayName': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = snapshot.members.joined.find((m) =>
                    areBuffersEqual(m.userAddress, creatorAddress),
                )
                if (!member) {
                    return
                }
                member.displayName = create(WrappedEncryptedDataSchema, {
                    data: value,
                    eventNum,
                    eventHash,
                })
            }
        }

        case 'username': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = snapshot.members.joined.find((m) =>
                    areBuffersEqual(m.userAddress, creatorAddress),
                )
                if (!member) {
                    return
                }
                member.username = create(WrappedEncryptedDataSchema, {
                    data: value,
                    eventNum,
                    eventHash,
                })
            }
        }

        case 'ensAddress': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = snapshot.members.joined.find((m) =>
                    areBuffersEqual(m.userAddress, creatorAddress),
                )
                if (!member) {
                    return
                }
                member.ensAddress = value
            }
        }

        case 'nft': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = snapshot.members.joined.find((m) =>
                    areBuffersEqual(m.userAddress, creatorAddress),
                )
                if (!member) {
                    return
                }
                member.nft = value
            }
        }

        case 'pin': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const snappedPin = create(MemberPayload_SnappedPinSchema, {
                    creatorAddress,
                    pin: value,
                })
                snapshot.members.pins.push(snappedPin)
            }
        }

        case 'unpin': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const unpin = value
                snapshot.members.pins = snapshot.members.pins.filter(
                    (p) => !areBuffersEqual(p.pin?.eventId || new Uint8Array(), unpin.eventId),
                )
            }
        }

        case 'encryptionAlgorithm': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                snapshot.members.encryptionAlgorithm = value
            }
        }

        case 'memberBlockchainTransaction': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const transaction = value.transaction
                if (!transaction || !transaction.content.case) {
                    return
                }

                if (transaction.content.case === 'tip') {
                    if (!snapshot.members.tips) {
                        snapshot.members.tips = {}
                    }
                    const currency = bin_toHexString(
                        transaction.content.value.event?.currency || new Uint8Array(),
                    )
                    if (!snapshot.members.tips[currency]) {
                        snapshot.members.tips[currency] = 0n
                    }
                    snapshot.members.tips[currency] += transaction.content.value.event?.amount || 0n
                }
            }
        }

        default:
            logNever(memberPayload.content, 'Unknown member payload content type')
            return undefined
    }
}

function areBuffersEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}
