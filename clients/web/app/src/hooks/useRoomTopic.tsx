import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { RoomIdentifier, useZionClient, useZionContext } from 'use-zion-client'
import { useRetryUntilResolved } from './useRetryUntilResolved'

const queryKey = 'roomTopic'

export const useGetRoomTopic = (roomId: RoomIdentifier | undefined) => {
    const { client } = useZionClient()

    const _getRoomTopic = useCallback(async () => {
        if (!client || !roomId) {
            return
        }
        // don't need the version wrapped in useWithCatch b/c it auto retries with a backoff and causes this to take a while to resolve
        return client.getRoomTopic(roomId)
    }, [client, roomId])

    return useQuery([queryKey, roomId?.networkId], _getRoomTopic, {
        enabled: !!roomId?.networkId,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 60 * 24,
        cacheTime: 1000 * 60 * 60 * 24,
    })
}

export const useSetRoomTopic = (roomId: RoomIdentifier | undefined) => {
    const queryClient = useQueryClient()

    const { setRoomTopic } = useZionClient()

    const _setRoomTopic = useCallback(
        (description: string) => {
            if (!roomId) {
                return Promise.resolve()
            }
            return setRoomTopic(roomId, description)
        },
        [setRoomTopic, roomId],
    )

    return useMutation(_setRoomTopic, {
        onSuccess: async () => {
            return queryClient.invalidateQueries(['roomTopic', roomId?.networkId])
        },
    })
}

// NOT in use - experiment for showing bio on InviteLinkLanding - as suspected, throws an unauthorized error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useGetRoomTopicWhileLoggedOut = (roomId: RoomIdentifier | undefined) => {
    const { clientSingleton } = useZionContext()
    const hasSingleton = useRetryUntilResolved(() => Boolean(clientSingleton), 100, 5000)

    const _getRoomTopic = useCallback(() => {
        if (!roomId || !hasSingleton || !clientSingleton) {
            return
        }
        return clientSingleton.getRoomTopic(roomId)
    }, [roomId, hasSingleton, clientSingleton])

    return useQuery([queryKey, roomId?.networkId], _getRoomTopic, {
        enabled: Boolean(roomId) && hasSingleton && Boolean(clientSingleton),
        staleTime: 1000 * 60 * 60 * 24,
    })
}
