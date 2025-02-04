import {
    Client as CasablancaClient,
    UserInfo,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
} from '@river-build/sdk'
import { useUserLookupStore } from '../store/use-user-lookup-store'
import { LookupUser } from '../types/user-lookup'
import { useEffect, useCallback, useRef } from 'react'
import { dlogger } from '@river-build/dlog'
import { SnapshotCaseType } from '@river-build/proto'
import { TownsOpts } from '../client/TownsClientTypes'
import { useSpaceEnsLookup } from './use-ens-lookup'
import { TownsClient } from 'client/TownsClient'
import { EnsInfo } from './use-ens-lookup'
import { useShallow } from 'zustand/react/shallow'

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
    return !!(maybeInfo && maybeInfo.username !== '')
}

const isUserInfo = (maybeInfo?: UserInfo): maybeInfo is UserInfo => {
    return !!(
        !!maybeInfo &&
        typeof maybeInfo.username === 'string' &&
        typeof maybeInfo.displayName === 'string'
    )
}

const createUserLookup = (userId: string, info: UserInfo, ens?: EnsInfo): LookupUser =>
    ({
        userId: userId,
        username: info.username,
        usernameConfirmed: info.usernameConfirmed,
        usernameEncrypted: info.usernameEncrypted,
        displayName: info.displayName,
        displayNameEncrypted: info.displayNameEncrypted,
        ensAddress: ens?.ensAddress,
        nft: info.nft,
        ensName: ens?.ensName,
    } as const)

export const useUserLookupUpdater = (
    townsOpts: TownsOpts,
    client?: CasablancaClient,
    townsClient?: TownsClient,
) => {
    const { ethMainnetRpcUrl } = townsOpts
    const { setSpaceUsers, setSpaceUser, setChannelUser, setChannelUsers, updateUserEverywhere } =
        useUserLookupStore(
            useShallow((s) => ({
                setSpaceUsers: s.setSpaceUsers,
                setSpaceUser: s.setSpaceUser,
                setChannelUser: s.setChannelUser,
                setChannelUsers: s.setChannelUsers,
                updateUserEverywhere: s.updateUserEverywhere,
            })),
        )
    const { getEnsData } = useSpaceEnsLookup({ ethMainnetRpcUrl, townsClient })

    const onStreamMetadataUpdated = useCallback(
        (streamId: string, userId: string) => {
            dlog.log('onStreamMetadataUpdated', streamId, userId)
            if (isSpaceStreamId(streamId)) {
                const stream = client?.streams.get(streamId)
                const metadata = stream?.view.getMemberMetadata()
                const info = metadata?.userInfo(userId)
                if (isUserInfo(info)) {
                    const update = async () => {
                        let ens: EnsInfo | undefined
                        if (info.ensAddress) {
                            ens = await getEnsData(userId, info?.ensAddress)
                        }
                        const lookupUser = createUserLookup(userId, info, ens)
                        setSpaceUser(userId, lookupUser, streamId)
                    }
                    void update()
                }
            } else if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
                const stream = client?.streams.get(streamId)
                const metadata = stream?.view.getMemberMetadata()
                const info = metadata?.userInfo(userId)
                if (meaningfulInfo(info)) {
                    const update = async () => {
                        let ens: EnsInfo | undefined
                        if (info.ensAddress) {
                            ens = await getEnsData(userId, info?.ensAddress)
                        }
                        const lookupUser = createUserLookup(userId, info, ens)
                        setChannelUser(userId, lookupUser, streamId)
                    }
                    void update()
                }
            }
        },
        [client?.streams, getEnsData, setChannelUser, setSpaceUser],
    )

    const onStreamInitialized = useCallback(
        (streamId: string, contentKind: SnapshotCaseType) => {
            dlog.log('onStreamInitialized', streamId, contentKind)
            const stream = client?.streams.get(streamId)
            const metadata = stream?.view.getMemberMetadata()

            if (!stream || !metadata) {
                return
            }

            const spaceRecords: { userId: string; user: LookupUser; spaceId?: string }[] = []
            const channelRecords: { userId: string; user: LookupUser; channelId?: string }[] = []
            const updatePromises: Promise<void>[] = []

            for (const userId of stream.view.getMembers().participants() ?? []) {
                const info = metadata.userInfo(userId)
                if (isUserInfo(info)) {
                    const update = async () => {
                        let ens: EnsInfo | undefined
                        if (info.ensAddress) {
                            ens = await getEnsData(userId, info?.ensAddress, false)
                        }
                        const lookupUser = createUserLookup(userId, info, ens)
                        switch (contentKind) {
                            case SnapshotCaseTypeValues.spaceContent:
                                spaceRecords.push({ userId, user: lookupUser, spaceId: streamId })
                                break

                            case SnapshotCaseTypeValues.dmChannelContent:
                            case SnapshotCaseTypeValues.gdmChannelContent:
                                if (meaningfulInfo(info)) {
                                    channelRecords.push({
                                        userId,
                                        user: lookupUser,
                                        channelId: streamId,
                                    })
                                }
                                break
                        }
                    }
                    updatePromises.push(update())
                }
            }

            void Promise.all(updatePromises).then(() => {
                if (spaceRecords.length > 0) {
                    setSpaceUsers(spaceRecords)
                }
                if (channelRecords.length > 0) {
                    setChannelUsers(channelRecords)
                }
            })
        },
        [client?.streams, getEnsData, setChannelUsers, setSpaceUsers],
    )

    const onWalletUnlinked = useCallback(
        (userId: string, walletUnlinked: string) => {
            updateUserEverywhere(userId, (user) => {
                if (user.ensAddress === walletUnlinked) {
                    return {
                        ...user,
                        ensName: undefined,
                        ensAddress: undefined,
                    }
                }
                return user
            })
        },
        [updateUserEverywhere],
    )

    const oldClient = useRef(client)
    useEffect(() => {
        if (oldClient.current === client) {
            dlog.log('useUserLookupUpdater, client changed', oldClient.current, client)
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
        townsClient?.on('onWalletUnlinked', onWalletUnlinked)
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
            townsClient?.on('onWalletUnlinked', onWalletUnlinked)
        }
    }, [client, onStreamInitialized, onStreamMetadataUpdated, onWalletUnlinked, townsClient])
}
