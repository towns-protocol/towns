import { Client as CasablancaClient } from '@towns-protocol/sdk'
import { useMemo } from 'react'
import { SpaceItem } from '../../types/towns-types'
import { useContractSpaceInfos } from '../../hooks/use-space-data'
import { useOfflineStore } from '../../store/use-offline-store'
import { TownsOpts } from '../../client/TownsClientTypes'

export function useCasablancaSpaces(
    opts: TownsOpts,
    spaceIds: string[],
    casablancaClient?: CasablancaClient,
): SpaceItem[] {
    const { data: spaceInfos } = useContractSpaceInfos(opts, spaceIds, casablancaClient)
    const { offlineSpaceInfoMap: spaceNamesInLocalStore } = useOfflineStore()
    return useMemo(() => {
        const streams = spaceIds.map((streamId: string) => {
            const spaceName =
                spaceInfos?.find((i) => i.networkId == streamId)?.name ??
                spaceNamesInLocalStore[streamId]?.name ??
                ''

            return {
                id: streamId,
                name: spaceName,
                avatarSrc: '',
            } satisfies SpaceItem
        })
        return streams
    }, [spaceIds, spaceInfos, spaceNamesInLocalStore])
}
