import { useQuery } from '../query/queryClient'
import { IZionServerVersions } from 'client/ZionClientTypes'
import { useEffect } from 'react'

export function useServerVersions(props: { homeserverUrl?: string }): {
    isFetched: boolean
    isSuccess: boolean
    isError: boolean
    serverVersions: IZionServerVersions | undefined
} {
    const { homeserverUrl } = props

    const {
        isFetched,
        isSuccess,
        isError,
        data: serverVersions,
    } = useQuery(
        // unique key per query so that React Query
        // can manage the cache for us.
        [homeserverUrl],
        // query function that does the data fetching.
        async () => {
            if (!homeserverUrl) {
                throw new Error('homeserverUrl is undefined')
            }
            const resp = await fetch(`${homeserverUrl}/_matrix/client/versions`)
            if (!resp.ok) {
                throw new Error('Network response was not ok')
            }
            return (await resp.json()) as IZionServerVersions
        },
        // options for the query.
        // query will not execute until the homeserverUrl is defined.
        // query will fail on first failure, since this is for availability testing
        { enabled: homeserverUrl !== undefined && homeserverUrl.length > 0, retry: false },
    )

    useEffect(() => console.log(`useServerVersions`, serverVersions), [serverVersions])
    return { isFetched, isSuccess, isError, serverVersions }
}
