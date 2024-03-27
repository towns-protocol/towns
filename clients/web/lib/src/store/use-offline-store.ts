import { SpaceInfo } from '@river-build/web3'
import isEqual from 'lodash/isEqual'
import { create, StateCreator } from 'zustand'
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware'

export type OfflineUser = {
    userId: string
    username: string
    displayName: string | undefined
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
    offlineSpaceInfoMap: OfflineSpaceInfoMap
    setOfflineSpaceInfo: (spaceInfo: SpaceInfo) => void
    offlineUserMap: OfflineUserMap
    setOfflineUser: (key: string, offlineUser: OfflineUser) => void
    offlineWalletAddressMap: OfflineWalletAddressMap
    setOfflineWalletAddress: (userId: string, abstractAccountAddress: string) => void
    offlineUserBioMap: OfflineUserBioMap
    setOfflineUserBio: (userId: string, bio: string) => void
}

type MyPersist = (
    config: StateCreator<OfflineStates>,
    options: PersistOptions<OfflineStates>,
) => StateCreator<OfflineStates>

export const OFFLINE_STORE_NAME = 'towns/offlineStore'

export const generateOfflineUserKey = (spaceId: string, walletAddress: string): string => {
    return `${spaceId}-${walletAddress}`
}

export const useOfflineStore = create<OfflineStates>(
    (persist as unknown as MyPersist)(
        (set) => ({
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
            offlineUserMap: {},
            setOfflineUser: (key: string, offlineUser: OfflineUser) =>
                set((state) => {
                    if (isEqual(state.offlineUserMap[key], offlineUser)) {
                        return state
                    }
                    return {
                        ...state,
                        offlineUserMap: {
                            ...state.offlineUserMap,
                            [key]: offlineUser,
                        },
                    }
                }),

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
            version: 1,
        },
    ),
)
