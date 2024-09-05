import { useMutation, useQueryClient } from '../query/queryClient'

import { SpaceInfo } from '@river-build/web3'
import { blockchainKeys } from '../query/query-keys'
import { useOfflineStore } from '../store/use-offline-store'

export type UseMutationSpaceInfoCacheProps = {
    onSuccess?: (spaceInfo: SpaceInfo) => void
}

export function useMutationSpaceInfoCache(props?: UseMutationSpaceInfoCacheProps) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (spaceInfo: SpaceInfo | undefined) => {
            if (!spaceInfo) {
                return Promise.resolve(undefined)
            }
            useOfflineStore.getState().setOfflineSpaceInfo(spaceInfo)
            return Promise.resolve(spaceInfo)
        },
        onSuccess: (data: SpaceInfo | undefined) => {
            if (!data) {
                return
            }
            const queryKey = blockchainKeys.spaceInfo(data.networkId ?? '')
            props?.onSuccess?.(data)
            return queryClient.invalidateQueries({
                queryKey,
            })
        },
        onError: (error: unknown) => {
            console.error('[useMutationSpaceInfoCache] error', error)
        },
    })
}
