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
import { migrateSnapshot } from './migrations/migrateSnapshot'
import { bin_toHexString } from '@towns-protocol/dlog'

/**
 * Mutates the snapshot with the given event.
 * @param rawSnapshot - The raw snapshot to update.
 * @param event - The event to update the snapshot with.
 * @param eventHash - The hash of the event.
 * @param miniblockNum - The miniblock number of the event.
 * @param eventNum - The event number of the event.
 */
export function updateSnapshot(
    rawSnapshot: Snapshot,
    event: StreamEvent,
    eventHash: Uint8Array,
    miniblockNum: bigint,
    eventNum: bigint,
) {
    const snapshot = migrateSnapshot(rawSnapshot) // TODO: do we to migrate here?
    if (!event.payload.case || !event.payload.value) {
        return new Error('No payload in event')
    }

    switch (event.payload.case) {
        case 'spacePayload':
            return updateSnapshotSpace(
                snapshot,
                event.payload.value,
                event.creatorAddress,
                eventNum,
                eventHash,
            )

        case 'channelPayload':
            return updateSnapshotChannel(snapshot, event.payload.value)

        case 'dmChannelPayload':
            return updateSnapshotDmChannel(snapshot, event.payload.value)

        case 'gdmChannelPayload':
            return updateSnapshotGdmChannel(snapshot, event.payload.value, miniblockNum, eventHash)

        case 'userPayload':
            return updateSnapshotUser(snapshot, event.payload.value)

        case 'userSettingsPayload':
            return updateSnapshotUserSettings(snapshot, event.payload.value)

        case 'userMetadataPayload':
            return updateSnapshotUserMetadata(snapshot, event.payload.value, eventNum, eventHash)

        case 'userInboxPayload':
            return updateSnapshotUserInbox(snapshot, event.payload.value, miniblockNum)

        case 'memberPayload':
            return updateSnapshotMember(
                snapshot,
                event.payload.value,
                event.creatorAddress,
                miniblockNum,
                eventNum,
                eventHash,
            )

        case 'mediaPayload':
            return new Error('Media payload snapshots are not supported')

        default:
            return new Error(`Unknown payload type ${event.payload.case}`)
    }
}

function updateSnapshotSpace(
    snapshot: Snapshot,
    spacePayload: SpacePayload,
    creatorAddress: Uint8Array,
    eventNum: bigint,
    eventHash: Uint8Array,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'spaceContent') {
        return new Error('Snapshot is not a space snapshot')
    }

    const spaceContent = snapshot.content.value

    if (!spacePayload.content.case) {
        return new Error('No content in space payload')
    }

    switch (spacePayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')

        case 'channel': {
            const channel = create(SpacePayload_ChannelMetadataSchema, {
                channelId: spacePayload.content.value.channelId,
                op: spacePayload.content.value.op,
                originEvent: spacePayload.content.value.originEvent,
                updatedAtEventNum: eventNum,
                settings: spacePayload.content.value.settings || {
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
                        return new Error('Channel not found')
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
            return
        }

        case 'spaceImage':
            spaceContent.spaceImage = create(SpacePayload_SnappedSpaceImageSchema, {
                creatorAddress,
                data: spacePayload.content.value,
                eventNum,
                eventHash,
            })
            return

        case 'updateChannelAutojoin': {
            // argh, we need to update TS 5.5 to get better infer
            const channelId =
                spacePayload.content.case === 'updateChannelAutojoin'
                    ? spacePayload.content.value.channelId
                    : new Uint8Array()
            const channel = spaceContent.channels.find((c) =>
                areBuffersEqual(c.channelId, channelId),
            )
            if (!channel) {
                return new Error('Channel not found')
            }
            if (!channel.settings) {
                channel.settings = create(SpacePayload_ChannelSettingsSchema, {
                    autojoin: false,
                    hideUserJoinLeaveEvents: false,
                })
            }
            channel.settings.autojoin = spacePayload.content.value.autojoin
            return
        }

        case 'updateChannelHideUserJoinLeaveEvents': {
            const channelId =
                spacePayload.content.case === 'updateChannelHideUserJoinLeaveEvents'
                    ? spacePayload.content.value.channelId
                    : new Uint8Array()
            const channel = spaceContent.channels.find((c) =>
                areBuffersEqual(c.channelId, channelId),
            )
            if (!channel) {
                return new Error('Channel not found')
            }
            if (!channel.settings) {
                channel.settings = create(SpacePayload_ChannelSettingsSchema, {
                    autojoin: false,
                    hideUserJoinLeaveEvents: false,
                })
            }
            channel.settings.hideUserJoinLeaveEvents =
                spacePayload.content.value.hideUserJoinLeaveEvents
            return
        }

        default:
            return new Error(`Unknown space payload content type ${spacePayload.content}`)
    }
}

function updateSnapshotChannel(
    snapshot: Snapshot,
    channelPayload: ChannelPayload,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'channelContent') {
        return new Error('Snapshot is not a channel snapshot')
    }

    if (!channelPayload.content.case) {
        return new Error('No content in channel payload')
    }

    switch (channelPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')
        case 'message':
            return
        case 'redaction':
            return
        default:
            return new Error(`Unknown channel payload content type ${channelPayload.content}`)
    }
}

function updateSnapshotDmChannel(
    snapshot: Snapshot,
    dmChannelPayload: DmChannelPayload,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'dmChannelContent') {
        return new Error('Snapshot is not a DM channel snapshot')
    }

    if (!dmChannelPayload.content.case) {
        return new Error('No content in DM channel payload')
    }

    switch (dmChannelPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')
        case 'message':
            return
        default:
            return new Error(`Unknown DM channel payload content type ${dmChannelPayload.content}`)
    }
}

function updateSnapshotGdmChannel(
    snapshot: Snapshot,
    gdmChannelPayload: GdmChannelPayload,
    eventNum: bigint,
    eventHash: Uint8Array,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'gdmChannelContent') {
        return new Error('Snapshot is not a GDM channel snapshot')
    }

    const gdmContent = snapshot.content.value

    if (!gdmChannelPayload.content.case) {
        return new Error('No content in GDM channel payload')
    }

    switch (gdmChannelPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')
        case 'channelProperties':
            gdmContent.channelProperties = create(WrappedEncryptedDataSchema, {
                data: gdmChannelPayload.content.value,
                eventNum,
                eventHash,
            })
            return
        case 'message':
            return
        default:
            return new Error(
                `Unknown GDM channel payload content type ${gdmChannelPayload.content}`,
            )
    }
}

function updateSnapshotUser(snapshot: Snapshot, userPayload: UserPayload): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'userContent') {
        return new Error('Snapshot is not a user snapshot')
    }

    const userContent = snapshot.content.value

    if (!userPayload.content.case) {
        return new Error('No content in user payload')
    }

    switch (userPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')

        case 'userMembership': {
            // Insert or update membership
            const streamId =
                userPayload.content.case === 'userMembership'
                    ? userPayload.content.value.streamId
                    : new Uint8Array()
            const membershipIndex = userContent.memberships.findIndex((m) =>
                areBuffersEqual(m.streamId, streamId),
            )
            if (membershipIndex >= 0) {
                userContent.memberships[membershipIndex] = userPayload.content.value
            } else {
                userContent.memberships.push(userPayload.content.value)
            }
            return
        }

        case 'userMembershipAction':
            return

        case 'blockchainTransaction': {
            const transaction = userPayload.content.value
            if (!transaction.content.case) {
                return
            }

            if (transaction.content.case === 'tip') {
                if (!userContent.tipsSent) {
                    userContent.tipsSent = {}
                }
                const currency = bin_toHexString(
                    transaction.content.value.event?.currency || new Uint8Array(),
                )
                if (!userContent.tipsSent[currency]) {
                    userContent.tipsSent[currency] = 0n
                }
                userContent.tipsSent[currency] += transaction.content.value.event?.amount || 0n
            }
            return
        }

        case 'receivedBlockchainTransaction': {
            const transaction = userPayload.content.value.transaction
            if (!transaction || !transaction.content.case) {
                return
            }

            if (transaction.content.case === 'tip') {
                if (!userContent.tipsReceived) {
                    userContent.tipsReceived = {}
                }
                const currency = bin_toHexString(
                    transaction.content.value.event?.currency || new Uint8Array(),
                )
                if (!userContent.tipsReceived[currency]) {
                    userContent.tipsReceived[currency] = 0n
                }
                userContent.tipsReceived[currency] += transaction.content.value.event?.amount || 0n
            }
            return
        }

        default:
            return new Error(`Unknown user payload content type ${userPayload.content}`)
    }
}

function updateSnapshotUserSettings(
    snapshot: Snapshot,
    userSettingsPayload: UserSettingsPayload,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'userSettingsContent') {
        return new Error('Snapshot is not a user settings snapshot')
    }

    const settingsContent = snapshot.content.value

    if (!userSettingsPayload.content.case) {
        return new Error('No content in user settings payload')
    }

    switch (userSettingsPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')

        case 'fullyReadMarkers': {
            const marker = userSettingsPayload.content.value
            const markerIndex = settingsContent.fullyReadMarkers.findIndex((m) =>
                areBuffersEqual(m.streamId, marker.streamId),
            )
            if (markerIndex >= 0) {
                settingsContent.fullyReadMarkers[markerIndex] = marker
            } else {
                settingsContent.fullyReadMarkers.push(marker)
            }
            return
        }

        case 'userBlock': {
            const block = userSettingsPayload.content.value
            const userBlocks = settingsContent.userBlocksList.find((ub) =>
                areBuffersEqual(ub.userId, block.userId),
            )

            if (userBlocks) {
                userBlocks.blocks.push(
                    create(UserSettingsPayload_Snapshot_UserBlocks_BlockSchema, {
                        isBlocked: block.isBlocked,
                        eventNum: block.eventNum,
                    }),
                )
            } else {
                settingsContent.userBlocksList.push(
                    create(UserSettingsPayload_Snapshot_UserBlocksSchema, {
                        userId: block.userId,
                        blocks: [
                            {
                                isBlocked: block.isBlocked,
                                eventNum: block.eventNum,
                            },
                        ],
                    }),
                )
            }
            return
        }

        default:
            return new Error(
                `Unknown user settings payload content type ${userSettingsPayload.content}`,
            )
    }
}

function updateSnapshotUserMetadata(
    snapshot: Snapshot,
    userMetadataPayload: UserMetadataPayload,
    eventNum: bigint,
    eventHash: Uint8Array,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'userMetadataContent') {
        return new Error('Snapshot is not a user metadata snapshot')
    }

    const metadataContent = snapshot.content.value

    if (!userMetadataPayload.content.case) {
        return new Error('No content in user metadata payload')
    }

    switch (userMetadataPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')

        case 'encryptionDevice': {
            const device = userMetadataPayload.content.value
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
            return
        }

        case 'profileImage':
            metadataContent.profileImage = create(WrappedEncryptedDataSchema, {
                data: userMetadataPayload.content.value,
                eventNum,
                eventHash,
            })
            return

        case 'bio':
            metadataContent.bio = create(WrappedEncryptedDataSchema, {
                data: userMetadataPayload.content.value,
                eventNum,
                eventHash,
            })
            return

        default:
            return new Error(
                `Unknown user metadata payload content type ${userMetadataPayload.content}`,
            )
    }
}

function updateSnapshotUserInbox(
    snapshot: Snapshot,
    userInboxPayload: UserInboxPayload,
    miniblockNum: bigint,
): Error | undefined {
    if (!snapshot.content.case || snapshot.content.case !== 'userInboxContent') {
        return new Error('Snapshot is not a user inbox snapshot')
    }

    const inboxContent = snapshot.content.value

    if (!userInboxPayload.content.case) {
        return new Error('No content in user inbox payload')
    }

    switch (userInboxPayload.content.case) {
        case 'inception':
            return new Error('Cannot update snapshot with inception event')

        case 'groupEncryptionSessions': {
            if (!inboxContent.deviceSummary) {
                inboxContent.deviceSummary = {}
            }

            // Update device summaries
            for (const deviceKey in userInboxPayload.content.value.ciphertexts) {
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
            return
        }

        case 'ack': {
            const ack = userInboxPayload.content.value
            if (!inboxContent.deviceSummary) {
                return
            }

            const deviceKey = ack.deviceKey
            const summary = inboxContent.deviceSummary[deviceKey]

            if (summary) {
                if (summary.upperBound <= ack.miniblockNum) {
                    delete inboxContent.deviceSummary[deviceKey]
                } else {
                    summary.lowerBound = ack.miniblockNum + 1n
                }
            }

            cleanupSnapshotUserInbox(inboxContent, miniblockNum)
            return
        }

        default:
            return new Error(`Unknown user inbox payload content type ${userInboxPayload.content}`)
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
    snapshot: Snapshot,
    memberPayload: MemberPayload,
    creatorAddress: Uint8Array,
    miniblockNum: bigint,
    eventNum: bigint,
    eventHash: Uint8Array,
): Error | undefined {
    if (!snapshot.members) {
        return new Error('Snapshot has no members')
    }

    if (!memberPayload.content.case) {
        return new Error('No content in member payload')
    }

    switch (memberPayload.content.case) {
        case 'membership': {
            const membership = memberPayload.content.value
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

        case 'keySolicitation': {
            const member = snapshot.members.joined.find((m) =>
                areBuffersEqual(m.userAddress, creatorAddress),
            )
            if (!member) {
                return
            }

            const solicitation = memberPayload.content.value
            member.solicitations = member.solicitations.filter(
                (s) => s.deviceKey !== solicitation.deviceKey,
            )

            const MAX_DEVICES = 10
            const startIndex = Math.max(0, member.solicitations.length - MAX_DEVICES + 1)
            member.solicitations = [...member.solicitations.slice(startIndex), solicitation]
            return
        }

        case 'keyFulfillment': {
            const fulfillment = memberPayload.content.value
            const member = snapshot.members.joined.find((m) =>
                areBuffersEqual(m.userAddress, fulfillment.userAddress),
            )
            if (!member) {
                return
            }

            const solicitation = member.solicitations.find(
                (s) => s.deviceKey === fulfillment.deviceKey,
            )
            if (solicitation) {
                solicitation.sessionIds = solicitation.sessionIds.filter(
                    (id) => !fulfillment.sessionIds.includes(id),
                )
                solicitation.isNewDevice = false
            }
            return
        }

        case 'displayName': {
            const member = snapshot.members.joined.find((m) =>
                areBuffersEqual(m.userAddress, creatorAddress),
            )
            if (!member) {
                return
            }
            member.displayName = create(WrappedEncryptedDataSchema, {
                data: memberPayload.content.value,
                eventNum,
                eventHash,
            })
            return
        }

        case 'username': {
            const member = snapshot.members.joined.find((m) =>
                areBuffersEqual(m.userAddress, creatorAddress),
            )
            if (!member) {
                return
            }
            member.username = create(WrappedEncryptedDataSchema, {
                data: memberPayload.content.value,
                eventNum,
                eventHash,
            })
            return
        }

        case 'ensAddress': {
            const member = snapshot.members.joined.find((m) =>
                areBuffersEqual(m.userAddress, creatorAddress),
            )
            if (!member) {
                return
            }
            member.ensAddress = memberPayload.content.value
            return
        }

        case 'nft': {
            const member = snapshot.members.joined.find((m) =>
                areBuffersEqual(m.userAddress, creatorAddress),
            )
            if (!member) {
                return
            }
            member.nft = memberPayload.content.value
            return
        }

        case 'pin': {
            const snappedPin = create(MemberPayload_SnappedPinSchema, {
                creatorAddress,
                pin: memberPayload.content.value,
            })
            snapshot.members.pins.push(snappedPin)
            return
        }

        case 'unpin': {
            const unpin = memberPayload.content.value
            snapshot.members.pins = snapshot.members.pins.filter(
                (p) => !areBuffersEqual(p.pin?.eventId || new Uint8Array(), unpin.eventId),
            )
            return
        }

        case 'encryptionAlgorithm':
            snapshot.members.encryptionAlgorithm = memberPayload.content.value
            return

        case 'memberBlockchainTransaction': {
            const transaction = memberPayload.content.value.transaction
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
            return
        }

        default:
            return new Error(`Unknown member payload content type ${memberPayload.content}`)
    }
}

function areBuffersEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}
