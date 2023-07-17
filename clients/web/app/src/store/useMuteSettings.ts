import { create } from 'zustand'
import { PersistStorage, combine, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { MuteStoreKeys, muteSettings } from '../idb/muteSettings'
const { get, set, del } = muteSettings

interface MuteSettings {
    mutedChannels: { [channelId: string]: boolean }
    mutedSpaces: { [spaceId: string]: boolean }
}

const idbStorage: PersistStorage<MuteSettings> = {
    getItem: async () => {
        const result = {
            mutedChannels: {},
            mutedSpaces: {},
        } as MuteSettings
        result.mutedChannels = (await get(MuteStoreKeys.mutedChannels)) ?? {}
        result.mutedSpaces = (await get(MuteStoreKeys.mutedSpaces)) ?? {}
        return { state: result, version: 0 }
    },
    setItem: async (_, value) => {
        await set(value.state.mutedChannels, MuteStoreKeys.mutedChannels)
        await set(value.state.mutedSpaces, MuteStoreKeys.mutedSpaces)
    },
    removeItem: async (name): Promise<void> => {
        await del(name as MuteStoreKeys)
    },
}

const storage: PersistStorage<MuteSettings> | undefined =
    typeof IDBDatabase !== 'undefined' ? idbStorage : undefined

const storeBase = persist(
    immer(
        combine(
            {
                mutedChannels: {},
                mutedSpaces: {},
            } as MuteSettings,
            (set, get) => ({
                setChannelMuted: (channelId: string, isMuted: boolean) => {
                    set((state) => {
                        if (isMuted) {
                            state.mutedChannels[channelId] = true
                        } else {
                            delete state.mutedChannels[channelId]
                        }
                        return state
                    })
                },

                setSpaceMuted(spaceId: string, isMuted: boolean) {
                    set((state) => {
                        if (isMuted) {
                            state.mutedSpaces[spaceId] = true
                        } else {
                            delete state.mutedSpaces[spaceId]
                        }
                        return state
                    })
                },
            }),
        ),
    ),
    { name: 'mute-settings', storage: storage },
)

export const useMuteSettings = create(storeBase)

// TODO: this is only used in service worker. mute settings can be grabbed directly from idb? why do we go through zustand?
export const getServiceWorkerMuteSettings = async () => {
    await useMuteSettings.persist.rehydrate()
    const state = useMuteSettings.getState()
    return { mutedChannels: state.mutedChannels, mutedSpaces: state.mutedSpaces }
}
