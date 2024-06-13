import {
    Client as CasablancaClient,
    UserInfo,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
} from '@river/sdk'
import { useUserLookupStore } from '../store/use-user-lookup-store'
import { LookupUser } from '../types/user-lookup'
import { useEffect, useCallback, useRef } from 'react'
import { dlogger } from '@river-build/dlog'
import { SnapshotCaseType } from '@river-build/proto'
import { TownsOpts } from '../client/TownsClientTypes'
import { useSpaceEnsLookup } from './use-ens-lookup'

const dlog = dlogger('csb:hooks:user-lookup-updater')

const SnapshotCaseTypeValues = {
    spaceContent: 'spaceContent',
    channelContent: 'channelContent',
    userContent: 'userContent',
    userSettingsContent: 'userSettingsContent',
    userDeviceKeyContent: 'userDeviceKeyContent',
    mediaContent: 'mediaContent',
    dmChannelContent: 'dmChannelContent',
    gdmChannelContent: 'gdmChannelContent',
    userInboxContent: 'userInboxContent',
} as const

const meaningfulInfo = (maybeInfo?: UserInfo): maybeInfo is UserInfo => {
    return !!(typeof maybeInfo?.username !== 'undefined')
}

const createUserLookup = (userId: string, info: UserInfo, ensName?: string): LookupUser =>
    ({
        userId: userId,
        username: info.username,
        usernameConfirmed: info.usernameConfirmed,
        usernameEncrypted: info.usernameEncrypted,
        displayName: info.displayName,
        displayNameEncrypted: info.displayNameEncrypted,
        ensAddress: info.ensAddress,
        nft: info.nft,
        ensName,
    } as const)

export const useUserLookupUpdater = (townsOpts: TownsOpts, client?: CasablancaClient) => {
    const { setUser } = useUserLookupStore()
    const { getEnsFromAddress } = useSpaceEnsLookup()

    const onStreamMetadataUpdated = useCallback(
        (streamId: string, userId: string) => {
            dlog.info('onStreamMetadataUpdated', streamId, userId)
            if (isSpaceStreamId(streamId)) {
                const stream = client?.streams.get(streamId)
                const metadata = stream?.view.getUserMetadata()
                const info = metadata?.userInfo(userId)
                if (meaningfulInfo(info)) {
                    const ensName = getEnsFromAddress(info?.ensAddress)
                    const lookupUser = createUserLookup(userId, info, ensName)
                    setUser(userId, lookupUser, streamId)
                }
            } else if (isChannelStreamId(streamId)) {
                const stream = client?.streams.get(streamId)
                const metadata = stream?.view.getUserMetadata()
                const info = metadata?.userInfo(userId)
                if (meaningfulInfo(info)) {
                    const channelId = streamId
                    const spaceId = stream?.view.getContent().getStreamParentId()
                    const ensName = getEnsFromAddress(info?.ensAddress)
                    const lookupUser = createUserLookup(userId, info, ensName)
                    setUser(userId, lookupUser, spaceId, channelId)
                }
            } else if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                const stream = client?.streams.get(streamId)
                const metadata = stream?.view.getUserMetadata()
                const info = metadata?.userInfo(userId)
                if (meaningfulInfo(info)) {
                    const ensName = getEnsFromAddress(info?.ensAddress)
                    const lookupUser = createUserLookup(userId, info, ensName)
                    setUser(userId, lookupUser, undefined, streamId)
                }
            }
        },
        [client?.streams, getEnsFromAddress, setUser],
    )

    const onStreamInitialized = useCallback(
        (streamId: string, contentKind: SnapshotCaseType) => {
            dlog.info('onStreamInitialized', streamId, contentKind)
            const stream = client?.streams.get(streamId)
            const metadata = stream?.view.getUserMetadata()

            if (!stream || !metadata) {
                return
            }

            for (const userId of stream.view.getMembers().participants() ?? []) {
                const info = metadata.userInfo(userId)
                if (meaningfulInfo(info)) {
                    const ens = getEnsFromAddress(info?.ensAddress)
                    const lookupUser = createUserLookup(userId, info, ens)

                    switch (contentKind) {
                        case SnapshotCaseTypeValues.spaceContent:
                            setUser(userId, lookupUser, streamId)
                            break
                        case SnapshotCaseTypeValues.channelContent:
                            {
                                const channelId = streamId
                                const spaceId = stream.view.getContent().getStreamParentId()
                                setUser(userId, lookupUser, spaceId, channelId)
                            }
                            break
                        case SnapshotCaseTypeValues.dmChannelContent:
                        case SnapshotCaseTypeValues.gdmChannelContent:
                            setUser(userId, lookupUser, undefined, streamId)
                            break
                    }
                }
            }
        },
        [client?.streams, getEnsFromAddress, setUser],
    )

    const oldClient = useRef(client)
    useEffect(() => {
        if (oldClient.current === client) {
            dlog.info('useUserLookupUpdater, client changed', oldClient.current, client)
            oldClient.current = client
        }

        if (!client) {
            return
        }

        client.on('streamInitialized', onStreamInitialized)
        client.on('streamMembershipUpdated', onStreamMetadataUpdated)
        client.on('streamDisplayNameUpdated', onStreamMetadataUpdated)
        client.on('streamPendingDisplayNameUpdated', onStreamMetadataUpdated)
        client.on('streamUsernameUpdated', onStreamMetadataUpdated)
        client.on('streamPendingUsernameUpdated', onStreamMetadataUpdated)
        client.on('streamNewUserJoined', onStreamMetadataUpdated)
        client.on('streamUserLeft', onStreamMetadataUpdated)
        client.on('streamEnsAddressUpdated', onStreamMetadataUpdated)
        client.on('streamNftUpdated', onStreamMetadataUpdated)
        return () => {
            client.off('streamInitialized', onStreamInitialized)
            client.off('streamMembershipUpdated', onStreamMetadataUpdated)
            client.off('streamDisplayNameUpdated', onStreamMetadataUpdated)
            client.off('streamPendingDisplayNameUpdated', onStreamMetadataUpdated)
            client.off('streamUsernameUpdated', onStreamMetadataUpdated)
            client.off('streamPendingUsernameUpdated', onStreamMetadataUpdated)
            client.off('streamNewUserJoined', onStreamMetadataUpdated)
            client.off('streamUserLeft', onStreamMetadataUpdated)
            client.off('streamEnsAddressUpdated', onStreamMetadataUpdated)
            client.off('streamNftUpdated', onStreamMetadataUpdated)
        }
    }, [client, onStreamInitialized, onStreamMetadataUpdated])
}
