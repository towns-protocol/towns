import React from 'react'
import {
    AsyncStorage,
    PersistQueryClientProvider,
    persistQueryClient,
} from '@tanstack/react-query-persist-client'
import { queryClient } from 'use-towns-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { del, get, set } from 'idb-keyval'

const storage = {
    getItem: async (key) => {
        return await get<string>(key)
    },
    setItem: async (key, value) => {
        await set(key, value)
    },
    removeItem: async (key) => {
        await del(key)
    },
} as AsyncStorage

const persister = createAsyncStoragePersister({ storage: storage })
persistQueryClient({ queryClient, persister })

export function AppQueryClientProvider(props: { children: JSX.Element }) {
    return (
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
            {props.children}
        </PersistQueryClientProvider>
    )
}
