import { ChannelMetadata, SpaceInfo } from '@river-build/web3'
import isEqual from 'lodash/isEqual'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type OfflineUser = {
    userId: string
    username: string
    displayName: string | undefined
}

export type OfflineChannelMetadata = {
    channel: ChannelMetadata
    updatedAtKey: string
}

// map <spaceId/networkId, SpaceInfo>
export type OfflineSpaceInfoMap = Record<string, SpaceInfo>
// 'spaceId-userId' as key, username and displayName might be different in different space
// map <spaceId-userId, OfflineUser>
export type OfflineUserMap = Record<string, OfflineUser>
// privy/wallet address, userId, rootKeyAddress are the same
// map <wallet address/userId, abstractAccountAddress>
export type OfflineWalletAddressMap = Record<string, string>
// map <abstractAccountAddress, bio>
export type OfflineUserBioMap = Record<string, string>

export type OfflineStates = {
    skipIsRegisteredCheck: Record<string, boolean>
    setSkipIsRegisteredCheck: (userAddress: string) => void
    offlineSpaceInfoMap: OfflineSpaceInfoMap
    setOfflineSpaceInfo: (spaceInfo: SpaceInfo) => void
    offlineChannelMetadataMap: Record<string, OfflineChannelMetadata>
    setOfflineChannelInfo: (channel: OfflineChannelMetadata) => void
    offlineWalletAddressMap: OfflineWalletAddressMap
    setOfflineWalletAddress: (userId: string, abstractAccountAddress: string) => void
    removeOfflineWalletAddress: (userId: string) => void
    offlineUserBioMap: OfflineUserBioMap
    setOfflineUserBio: (userId: string, bio: string) => void
}

export const OFFLINE_STORE_NAME = 'towns/offlineStore'

export const generateOfflineUserKey = (spaceId: string, walletAddress: string): string => {
    return `${spaceId}-${walletAddress}`
}

export const useOfflineStore = create<OfflineStates>()(
    persist(
        (set) => ({
            skipIsRegisteredCheck: {},
            setSkipIsRegisteredCheck(userAddress: string) {
                set((state) => {
                    if (state.skipIsRegisteredCheck[userAddress] === true) {
                        return state
                    }
                    return {
                        ...state,
                        skipIsRegisteredCheck: {
                            ...state.skipIsRegisteredCheck,
                            [userAddress]: true,
                        },
                    }
                })
            },
            offlineSpaceInfoMap: {},
            setOfflineSpaceInfo(spaceInfo) {
                set((state) => {
                    if (isEqual(state.offlineSpaceInfoMap[spaceInfo.networkId], spaceInfo)) {
                        return state
                    }
                    return {
                        ...state,
                        offlineSpaceInfoMap: {
                            ...state.offlineSpaceInfoMap,
                            [spaceInfo.networkId]: spaceInfo,
                        },
                    }
                })
            },
            offlineChannelMetadataMap: {},
            setOfflineChannelInfo(value) {
                set((state) => {
                    if (
                        isEqual(
                            state.offlineChannelMetadataMap[value.channel.channelNetworkId],
                            value,
                        )
                    ) {
                        return state
                    }
                    return {
                        ...state,
                        offlineChannelMetadataMap: {
                            ...state.offlineChannelMetadataMap,
                            [value.channel.channelNetworkId]: value,
                        },
                    }
                })
            },
            offlineWalletAddressMap: {},
            setOfflineWalletAddress: (userId: string, abstractAccountAddress: string) =>
                set((state) => {
                    if (state.offlineWalletAddressMap[userId] === abstractAccountAddress) {
                        return state
                    }
                    return {
                        ...state,
                        offlineWalletAddressMap: {
                            ...state.offlineWalletAddressMap,
                            [userId]: abstractAccountAddress,
                        },
                    }
                }),
            removeOfflineWalletAddress: (userId: string) =>
                set((state) => {
                    const { [userId]: _, ...rest } = state.offlineWalletAddressMap
                    return {
                        ...state,
                        offlineWalletAddressMap: rest,
                    }
                }),
            offlineUserBioMap: {},
            setOfflineUserBio: (userId: string, bio: string) => {
                set((state) => {
                    if (state.offlineUserBioMap[userId] === bio) {
                        return state
                    }
                    return {
                        ...state,
                        offlineUserBioMap: {
                            ...state.offlineUserBioMap,
                            [userId]: bio,
                        },
                    }
                })
            },
        }),
        {
            name: OFFLINE_STORE_NAME,
            storage: createJSONStorage(() => localStorage),
            version: 2,
        },
    ),
)
