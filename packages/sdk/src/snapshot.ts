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
    SpacePayload_ChannelMetadata,
    ChannelOp,
    SpacePayload_ChannelSettingsSchema,
    SpacePayload_SnappedSpaceImageSchema,
    MemberPayload_SnappedPinSchema,
    WrappedEncryptedDataSchema,
    MembershipOp,
    MemberPayload_Snapshot_MemberSchema,
    MemberPayload_Snapshot_Member,
    type UserInboxPayload_Snapshot,
    UserInboxPayload_Snapshot_DeviceSummarySchema,
    UserSettingsPayload_Snapshot_UserBlocks_BlockSchema,
    UserSettingsPayload_Snapshot_UserBlocksSchema,
    UserPayload_UserMembership,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_Snapshot_UserBlocks,
    UserSettingsPayload_UserBlock,
    MemberPayload_KeySolicitation,
    MemberPayload_KeyFulfillment,
    MemberPayload_KeySolicitationSchema,
    SnapshotSchema,
    MemberPayload_SnapshotSchema,
    SpacePayload_SnapshotSchema,
    ChannelPayload_SnapshotSchema,
    DmChannelPayload_SnapshotSchema,
    GdmChannelPayload_SnapshotSchema,
    UserPayload_SnapshotSchema,
    UserSettingsPayload_SnapshotSchema,
    UserMetadataPayload_SnapshotSchema,
    UserInboxPayload_SnapshotSchema,
    MediaPayload_SnapshotSchema,
    SpacePayload_ChannelSettings,
    StreamSettings,
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
    // const snapshot = migrateSnapshot(rawSnapshot) // TODO: do we need to migrate here?
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

        case 'miniblockHeader':
            return undefined

        default:
            logNever(event.payload, 'Unknown payload type')
            return undefined
    }
}

function findSorted<T extends { [key: string]: unknown }, K>(
    elements: T[],
    key: K,
    cmp: (a: K, b: K) => number,
    keyFn: (element: T) => K,
): T | undefined {
    let low = 0
    let high = elements.length - 1

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const comparison = cmp(keyFn(elements[mid]), key)

        if (comparison === 0) {
            return elements[mid]
        } else if (comparison < 0) {
            low = mid + 1
        } else {
            high = mid - 1
        }
    }
    return undefined
}

function insertSorted<T extends { [key: string]: unknown }, K>(
    elements: T[],
    element: T,
    cmp: (a: K, b: K) => number,
    keyFn: (element: T) => K,
): T[] {
    const key = keyFn(element)
    let low = 0
    let high = elements.length - 1

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const comparison = cmp(keyFn(elements[mid]), key)

        if (comparison === 0) {
            elements[mid] = element
            return elements
        } else if (comparison < 0) {
            low = mid + 1
        } else {
            high = mid - 1
        }
    }

    elements.splice(low, 0, element)
    return elements
}

function removeSorted<T extends { [key: string]: unknown }, K>(
    elements: T[],
    key: K,
    cmp: (a: K, b: K) => number,
    keyFn: (element: T) => K,
): T[] {
    let low = 0
    let high = elements.length - 1

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const comparison = cmp(keyFn(elements[mid]), key)

        if (comparison === 0) {
            return [...elements.slice(0, mid), ...elements.slice(mid + 1)]
        } else if (comparison < 0) {
            low = mid + 1
        } else {
            high = mid - 1
        }
    }
    return elements
}

function findChannel(
    channels: SpacePayload_ChannelMetadata[],
    channelId: Uint8Array,
): SpacePayload_ChannelMetadata | undefined {
    return findSorted(channels, channelId, compareBuffers, (channel) => channel.channelId)
}

function insertChannel(
    channels: SpacePayload_ChannelMetadata[],
    channel: SpacePayload_ChannelMetadata,
): SpacePayload_ChannelMetadata[] {
    return insertSorted(channels, channel, compareBuffers, (channel) => channel.channelId)
}

function findMember(
    members: MemberPayload_Snapshot_Member[],
    memberAddress: Uint8Array,
): MemberPayload_Snapshot_Member | undefined {
    return findSorted(members, memberAddress, compareBuffers, (member) => member.userAddress)
}

function removeMember(
    members: MemberPayload_Snapshot_Member[],
    memberAddress: Uint8Array,
): MemberPayload_Snapshot_Member[] {
    return removeSorted(members, memberAddress, compareBuffers, (member) => member.userAddress)
}

function insertMember(
    members: MemberPayload_Snapshot_Member[],
    member: MemberPayload_Snapshot_Member,
): MemberPayload_Snapshot_Member[] {
    return insertSorted(members, member, compareBuffers, (member) => member.userAddress)
}

export function findUserMembership(
    memberships: UserPayload_UserMembership[],
    streamId: Uint8Array,
): UserPayload_UserMembership | undefined {
    return findSorted(memberships, streamId, compareBuffers, (membership) => membership.streamId)
}

export function insertUserMembership(
    memberships: UserPayload_UserMembership[],
    membership: UserPayload_UserMembership,
): UserPayload_UserMembership[] {
    return insertSorted(
        memberships,
        membership,
        compareBuffers,
        (membership) => membership.streamId,
    )
}

export function insertFullyReadMarker(
    markers: UserSettingsPayload_FullyReadMarkers[],
    newMarker: UserSettingsPayload_FullyReadMarkers,
): UserSettingsPayload_FullyReadMarkers[] {
    return insertSorted(markers, newMarker, compareBuffers, (marker) => marker.streamId)
}

export function insertUserBlock(
    userBlocksArr: UserSettingsPayload_Snapshot_UserBlocks[],
    newUserBlock: UserSettingsPayload_UserBlock,
): UserSettingsPayload_Snapshot_UserBlocks[] {
    const userIdBytes = newUserBlock.userId

    const newBlock = create(UserSettingsPayload_Snapshot_UserBlocks_BlockSchema, {
        isBlocked: newUserBlock.isBlocked,
        eventNum: newUserBlock.eventNum,
    })

    let existingUserBlocks = findSorted(
        userBlocksArr,
        userIdBytes,
        compareBuffers,
        (userBlocks) => userBlocks.userId,
    )

    if (!existingUserBlocks) {
        existingUserBlocks = create(UserSettingsPayload_Snapshot_UserBlocksSchema, {
            userId: userIdBytes,
            blocks: [],
        })
    }

    existingUserBlocks.blocks.push(newBlock)

    return insertSorted(
        userBlocksArr,
        existingUserBlocks,
        compareBuffers,
        (userBlocks) => userBlocks.userId,
    )
}

function removeCommon(x: string[], y: string[]): string[] {
    const result: string[] = []
    let i = 0
    let j = 0

    while (i < x.length && j < y.length) {
        if (x[i] < y[j]) {
            result.push(x[i])
            i++
        } else if (x[i] > y[j]) {
            j++
        } else {
            i++
            j++
        }
    }

    // Append remaining elements from x
    if (i < x.length) {
        result.push(...x.slice(i))
    }

    return result
}

export function applyKeySolicitation(
    member: MemberPayload_Snapshot_Member | undefined,
    keySolicitation: MemberPayload_KeySolicitation,
): void {
    if (member) {
        // if solicitation exists for this device key, remove it
        let i = 0
        for (const event of member.solicitations) {
            if (event.deviceKey !== keySolicitation.deviceKey) {
                member.solicitations[i] = event
                i++
            }
        }

        // Clone to avoid data race
        const event = create(MemberPayload_KeySolicitationSchema, keySolicitation)

        // Append it, keeping max 10 devices
        const MAX_DEVICES = 10
        const startIndex = Math.max(0, i - MAX_DEVICES)
        member.solicitations = [...member.solicitations.slice(startIndex, i), event]
    }
}

export function applyKeyFulfillment(
    member: MemberPayload_Snapshot_Member | undefined,
    keyFulfillment: MemberPayload_KeyFulfillment,
): void {
    if (member) {
        // Clear out any fulfilled session ids for the device key
        for (const event of member.solicitations) {
            if (event.deviceKey === keyFulfillment.deviceKey) {
                event.sessionIds = removeCommon(
                    event.sessionIds || [],
                    keyFulfillment.sessionIds || [],
                )
                event.isNewDevice = false
                break
            }
        }
    }
}

function compareBuffers(a: Uint8Array, b: Uint8Array): number {
    const minLength = Math.min(a.length, b.length)
    for (let i = 0; i < minLength; i++) {
        if (a[i] !== b[i]) {
            return a[i] - b[i]
        }
    }
    return a.length - b.length
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

    if (!spacePayload.content.case) {
        return
    }

    switch (spacePayload.content.case) {
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
                        const existingChannel = findChannel(
                            spaceContent.channels,
                            channel.channelId,
                        )
                        if (!existingChannel) {
                            throw new Error('Channel not found')
                        }
                        channel.settings = existingChannel.settings
                    }
                }

                spaceContent.channels = insertChannel(spaceContent.channels, channel)
            }
        }

        case 'spaceImage': {
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
        }

        case 'updateChannelAutojoin': {
            const value = spacePayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const spaceContent = getContent(snapshot)
                const channel = findChannel(spaceContent.channels, value.channelId)
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
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const spaceContent = getContent(snapshot)
                const channel = findChannel(spaceContent.channels, value.channelId)
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
    if (!channelPayload.content.case) {
        return
    }
    switch (channelPayload.content.case) {
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
    if (!dmChannelPayload.content.case) {
        return
    }
    switch (dmChannelPayload.content.case) {
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

    if (!gdmChannelPayload.content.case) {
        return
    }
    switch (gdmChannelPayload.content.case) {
        case 'inception':
            return undefined
        case 'channelProperties': {
            const value = gdmChannelPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                const gdmContent = getContent(snapshot)
                gdmContent.channelProperties = create(WrappedEncryptedDataSchema, {
                    data: value,
                    eventNum,
                    eventHash,
                })
            }
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

    if (!userPayload.content.case) {
        return
    }
    switch (userPayload.content.case) {
        case 'inception':
            return undefined

        case 'userMembership': {
            const value = userPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const userContent = getContent(snapshot)
                userContent.memberships = insertUserMembership(userContent.memberships, value)
            }
        }

        case 'userMembershipAction':
            return

        case 'blockchainTransaction': {
            const value = userPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const userContent = getContent(snapshot)
                if (!value.content.case) {
                    return
                }
                switch (value.content.case) {
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
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const userContent = getContent(snapshot)
                if (!value.transaction) {
                    return
                }
                if (!value.transaction.content.case) {
                    return
                }
                switch (value.transaction.content.case) {
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

    if (!userSettingsPayload.content.case) {
        return
    }
    switch (userSettingsPayload.content.case) {
        case 'inception':
            return undefined

        case 'fullyReadMarkers': {
            const value = userSettingsPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const settingsContent = getContent(snapshot)
                settingsContent.fullyReadMarkers = insertFullyReadMarker(
                    settingsContent.fullyReadMarkers,
                    value,
                )
            }
        }

        case 'userBlock': {
            const value = userSettingsPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                const settingsContent = getContent(snapshot)
                settingsContent.userBlocksList = insertUserBlock(
                    settingsContent.userBlocksList,
                    value,
                )
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

    if (!userMetadataPayload.content.case) {
        return
    }
    switch (userMetadataPayload.content.case) {
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

    if (!userInboxPayload.content.case) {
        return
    }
    switch (userInboxPayload.content.case) {
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
    if (!memberPayload.content.case) {
        return
    }
    switch (memberPayload.content.case) {
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

                        snapshot.members.joined = insertMember(
                            snapshot.members.joined,
                            joinedMember,
                        )
                        return
                    }

                    case MembershipOp.SO_LEAVE:
                        snapshot.members.joined = removeMember(
                            snapshot.members.joined,
                            membership.userAddress,
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
                const member = findMember(snapshot.members.joined, creatorAddress)
                if (!member) {
                    return
                }
                applyKeySolicitation(member, value)
            }
        }

        case 'keyFulfillment': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = findMember(snapshot.members.joined, value.userAddress)
                if (!member) {
                    return
                }
                applyKeyFulfillment(member, value)
            }
        }

        case 'displayName': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = findMember(snapshot.members.joined, creatorAddress)
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
                const member = findMember(snapshot.members.joined, creatorAddress)
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
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = findMember(snapshot.members.joined, creatorAddress)
                if (!member) {
                    return
                }
                member.ensAddress = value
            }
        }

        case 'nft': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
                if (!snapshot.members) {
                    throw new Error('Snapshot has no members')
                }
                const member = findMember(snapshot.members.joined, creatorAddress)
                if (!member) {
                    return
                }
                member.nft = value
            }
        }

        case 'pin': {
            const value = memberPayload.content.value
            return (snapshot: Snapshot, _miniblockNum: bigint, _eventNum: bigint) => {
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

interface InceptionPayload {
    streamId: Uint8Array
    settings?: StreamSettings
    spaceSettings?: SpacePayload_ChannelSettings
    channelSettings?: SpacePayload_ChannelSettings
    dmChannelSettings?: {
        firstPartyAddress: Uint8Array
        secondPartyAddress: Uint8Array
    }
    gdmChannelSettings?: unknown
    userSettings?: unknown
    userSettingsSettings?: unknown
    userInboxSettings?: unknown
    userMetadataSettings?: unknown
    mediaSettings?: unknown
}

type SnapshotContent = Snapshot['content']

/**
 * Creates a genesis snapshot from a list of events.
 * The first event must be an inception event.
 * @param events - Array of StreamEvents to create the snapshot from
 * @returns A new Snapshot instance
 * @throws Error if no events provided or first event is not an inception event
 */
export function makeGenesisSnapshot(events: StreamEvent[]): Snapshot {
    if (events.length === 0) {
        throw new Error('No events to make snapshot from')
    }

    const creatorAddress = events[0].creatorAddress
    const inceptionPayload = getInceptionPayload(events[0])

    if (!inceptionPayload) {
        throw new Error('First event is not an inception event')
    }

    // Create initial snapshot with content and members
    const snapshot = create(SnapshotSchema, {
        content: makeSnapshotContent(inceptionPayload),
        members: makeSnapshotMembers(inceptionPayload, creatorAddress),
    })

    // Apply all subsequent events to the snapshot
    events.slice(1).forEach((event, i) => {
        const updateFn = updateSnapshot(event, new Uint8Array())
        if (updateFn) {
            updateFn(snapshot, BigInt(0), BigInt(i + 1))
        }
    })

    return snapshot
}

/**
 * Helper function to get the inception payload from a stream event
 */
function getInceptionPayload(event: StreamEvent): InceptionPayload | null {
    if (!event.payload.case) return null

    const payload = event.payload.value
    if (!payload?.content?.case || payload.content.case !== 'inception') return null

    const inceptionPayload = payload.content.value as InceptionPayload

    // Add the appropriate settings field based on the payload type
    switch (event.payload.case) {
        case 'spacePayload':
            return {
                ...inceptionPayload,
                spaceSettings: create(SpacePayload_ChannelSettingsSchema, {
                    autojoin: false,
                    hideUserJoinLeaveEvents: false,
                }),
            }
        case 'channelPayload':
            return {
                ...inceptionPayload,
                channelSettings: create(SpacePayload_ChannelSettingsSchema, {
                    autojoin: false,
                    hideUserJoinLeaveEvents: false,
                }),
            }
        case 'dmChannelPayload':
            return {
                ...inceptionPayload,
                dmChannelSettings: {
                    firstPartyAddress: event.creatorAddress,
                    secondPartyAddress: event.creatorAddress,
                },
            }
        case 'gdmChannelPayload':
            return {
                ...inceptionPayload,
                gdmChannelSettings: {},
            }
        case 'userPayload':
            return {
                ...inceptionPayload,
                userSettings: {},
            }
        case 'userSettingsPayload':
            return {
                ...inceptionPayload,
                userSettingsSettings: {},
            }
        case 'userInboxPayload':
            return {
                ...inceptionPayload,
                userInboxSettings: {},
            }
        case 'userMetadataPayload':
            return {
                ...inceptionPayload,
                userMetadataSettings: {},
            }
        case 'mediaPayload':
            return {
                ...inceptionPayload,
                mediaSettings: {},
            }
        default:
            return null
    }
}

/**
 * Creates the appropriate snapshot content based on the inception payload type
 */
function makeSnapshotContent(inceptionPayload: InceptionPayload): SnapshotContent {
    if (!inceptionPayload) {
        throw new Error('Invalid inception payload')
    }

    // Determine the type of inception payload and create appropriate content
    if (inceptionPayload.streamId) {
        if ('spaceSettings' in inceptionPayload) {
            return {
                case: 'spaceContent',
                value: create(SpacePayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('channelSettings' in inceptionPayload) {
            return {
                case: 'channelContent',
                value: create(ChannelPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('dmChannelSettings' in inceptionPayload) {
            return {
                case: 'dmChannelContent',
                value: create(DmChannelPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('gdmChannelSettings' in inceptionPayload) {
            return {
                case: 'gdmChannelContent',
                value: create(GdmChannelPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('userSettings' in inceptionPayload) {
            return {
                case: 'userContent',
                value: create(UserPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('userSettingsSettings' in inceptionPayload) {
            return {
                case: 'userSettingsContent',
                value: create(UserSettingsPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('userInboxSettings' in inceptionPayload) {
            return {
                case: 'userInboxContent',
                value: create(UserInboxPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('userMetadataSettings' in inceptionPayload) {
            return {
                case: 'userMetadataContent',
                value: create(UserMetadataPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        if ('mediaSettings' in inceptionPayload) {
            return {
                case: 'mediaContent',
                value: create(MediaPayload_SnapshotSchema, { inception: inceptionPayload }),
            }
        }
        throw new Error('Unknown inception payload type')
    }

    throw new Error('Invalid inception payload')
}

/**
 * Creates the snapshot members based on the inception payload type
 */
function makeSnapshotMembers(inceptionPayload: InceptionPayload, creatorAddress: Uint8Array) {
    if (!inceptionPayload) {
        throw new Error('Invalid inception payload')
    }

    const snapshot = create(MemberPayload_SnapshotSchema, {
        joined: [],
    })

    // Handle different types of inception payloads
    if (
        'userSettings' in inceptionPayload ||
        'userSettingsSettings' in inceptionPayload ||
        'userInboxSettings' in inceptionPayload ||
        'userMetadataSettings' in inceptionPayload
    ) {
        // For user streams, get the address from the stream ID
        const member = create(MemberPayload_Snapshot_MemberSchema, {
            userAddress: inceptionPayload.streamId,
        })
        snapshot.joined = insertMember(snapshot.joined, member)
    } else if ('dmChannelSettings' in inceptionPayload && inceptionPayload.dmChannelSettings) {
        // For DM channels, add both parties as members
        const firstMember = create(MemberPayload_Snapshot_MemberSchema, {
            userAddress: inceptionPayload.dmChannelSettings.firstPartyAddress,
        })
        const secondMember = create(MemberPayload_Snapshot_MemberSchema, {
            userAddress: inceptionPayload.dmChannelSettings.secondPartyAddress,
        })
        snapshot.joined = insertMember(snapshot.joined, firstMember)
        snapshot.joined = insertMember(snapshot.joined, secondMember)
    } else if ('mediaSettings' in inceptionPayload) {
        // For media payloads, add the creator as a member
        const member = create(MemberPayload_Snapshot_MemberSchema, {
            userAddress: creatorAddress,
        })
        snapshot.joined = insertMember(snapshot.joined, member)
    }

    return snapshot
}
