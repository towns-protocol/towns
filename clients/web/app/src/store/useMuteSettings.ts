import { create } from 'zustand'
import { PersistStorage, StorageValue, combine, persist } from 'zustand/middleware'
import { del, get, set } from 'idb-keyval'
import { immer } from 'zustand/middleware/immer'

interface MuteSettings {
    mutedChannels: { [channelId: string]: boolean }
    mutedSpaces: { [spaceId: string]: boolean }
}

const MUTED_CHANNELS_KEY = 'mutedChannels'
const MUTED_SPACES_KEY = 'mutedSpaces'

const idbStorage: PersistStorage<MuteSettings> = {
    getItem: async (name: string) => {
        const result = {
            mutedChannels: {},
            mutedSpaces: {},
        } as MuteSettings
        result.mutedChannels = (await get(MUTED_CHANNELS_KEY)) ?? {}
        result.mutedSpaces = (await get(MUTED_SPACES_KEY)) ?? {}
        return { state: result, version: 0 }
    },
    setItem: async (name: string, value: StorageValue<MuteSettings>) => {
        await set(MUTED_CHANNELS_KEY, value.state.mutedChannels)
        await set(MUTED_SPACES_KEY, value.state.mutedSpaces)
    },
    removeItem: async (name: string): Promise<void> => {
        await del(name)
    },
}

const storage: PersistStorage<MuteSettings> | undefined =
    window.indexedDB !== undefined ? idbStorage : undefined

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

export const getServiceWorkerMuteSettings = async () => {
    await useMuteSettings.persist.rehydrate()
    const state = useMuteSettings.getState()
    return { mutedChannels: state.mutedChannels, mutedSpaces: state.mutedSpaces }
}
