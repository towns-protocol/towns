import {
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isMediaStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserId,
    isUserSettingsStreamId,
    isUserStreamId,
    isValidStreamId,
} from '@river-build/sdk'
import { useMemo, useState } from 'react'
import { useAgentConnection, useSyncAgent } from '@river-build/react-sdk'
import { useQuery } from '@tanstack/react-query'
import { SpaceAddressFromSpaceId } from '@river-build/web3'
import { Input } from '@/components/ui/input'
import { GridSidePanel } from '@/components/layout/grid-side-panel'
import { jsonStringify } from '@/utils/json-stringify'

const checkId = (id: string) => {
    const checks = {
        isUserId,
        isUserStreamId,
        isSpaceStreamId,
        isChannelStreamId,
        isDMChannelStreamId,
        isUserMetadataStreamId: isUserDeviceStreamId,
        isUserSettingsStreamId,
        isMediaStreamId,
        isGDMChannelStreamId,
    }
    return Object.entries(checks).map(([name, check]) => ({
        name,
        result: check(id),
        resultIfStrip0x: id.startsWith('0x') ? check(id.slice(2)) : false,
        isStreamId: isValidStreamId(id),
    }))
}

const buildStreamMetadataUrl = (
    // eslint-disable-next-line @typescript-eslint/ban-types
    env: 'gamma' | 'omega' | 'alpha' | 'local_single' | (string & {}),
) => {
    switch (env) {
        case 'omega':
            return `https://river.delivery`
        case 'gamma':
            return `https://gamma.river.delivery`
        case 'alpha':
            return `https://alpha.river.delivery`
        default:
            return `http://localhost:3002`
    }
}

export const InspectRoute = () => {
    const [id, setId] = useState('')

    const checks = useMemo(() => checkId(id), [id])
    const isStreamId = checks.some(({ isStreamId }) => isStreamId)
    const isSpaceStreamId = checks.some(({ name, result }) => name === 'isSpaceStreamId' && result)

    return (
        <GridSidePanel
            side={
                <>
                    <div className="space-y-2">
                        <h2 className="text-lg font-medium">Inspect a ID</h2>
                        <Input
                            value={id}
                            placeholder="Enter the ID to inspect"
                            onChange={(e) => setId(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        {checks.map(({ name, result, resultIfStrip0x }) => (
                            <div key={name} className="flex items-center gap-2 font-mono">
                                <span>{name}: </span>
                                <span>
                                    {result ? '✅' : resultIfStrip0x ? '✅ (strip 0x)' : '❌'}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            }
            main={
                <>
                    {isStreamId && <StreamInfo streamId={id} />}
                    {isSpaceStreamId && <SpaceInfo spaceId={id} />}
                </>
            }
        />
    )
}

const StreamInfo = ({ streamId }: { streamId: string }) => {
    const sync = useSyncAgent()
    const {
        data: streamView,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['stream', streamId],
        queryFn: () => sync.riverConnection.call((client) => client.getStream(streamId)),
        enabled: !!streamId,
        refetchOnWindowFocus: false,
    })

    return (
        <>
            {isLoading && <p>Stream Loading...</p>}
            {error && (
                <div>
                    <p className="text-red-500">Error fetching stream</p>
                    <pre>{error?.message}</pre>
                </div>
            )}
            {streamView && (
                <div className="space-y-2">
                    <p>Stream View</p>
                    <pre>{jsonStringify(streamView, 2)}</pre>
                </div>
            )}
        </>
    )
}

const SpaceInfo = ({ spaceId }: { spaceId: string }) => {
    const { env } = useAgentConnection()
    const sync = useSyncAgent()

    const {
        data: fromSpaceOwner,
        isLoading: isLoadingFromSpaceOwner,
        error: errorFromSpaceOwner,
    } = useQuery({
        queryKey: ['from-space-owner', spaceId],
        queryFn: () => sync.riverConnection.spaceDapp.getSpaceInfo(spaceId),
        enabled: !!spaceId,
        refetchOnWindowFocus: false,
    })

    const {
        data: fromStreamMetadata,
        isLoading: isLoadingFromStreamMetadata,
        error: errorFromStreamMetadata,
    } = useQuery({
        queryKey: ['from-stream-metadata', !!spaceId],
        queryFn: async () => {
            if (!env) {
                return
            }
            const spaceAddress = SpaceAddressFromSpaceId(spaceId)
            return fetch(`${buildStreamMetadataUrl(env)}/space/${spaceAddress}`).then((res) =>
                res.json(),
            )
        },
        enabled: !!spaceId,
        refetchOnWindowFocus: false,
    })

    const isLoading = isLoadingFromSpaceOwner || isLoadingFromStreamMetadata

    return (
        <>
            {isLoading && <p>Space Loading...</p>}
            {errorFromSpaceOwner && (
                <div>
                    <p className="text-red-500">Error fetching space info from space owner</p>
                    <pre>{errorFromSpaceOwner?.message}</pre>
                </div>
            )}
            {errorFromStreamMetadata && (
                <div>
                    <p className="text-red-500">Error fetching from stream metadata</p>
                    <pre>{errorFromStreamMetadata?.message}</pre>
                </div>
            )}
            {fromStreamMetadata && (
                <div className="space-y-2">
                    <p>From Stream Metadata</p>
                    <pre>{jsonStringify(fromStreamMetadata, 2)}</pre>
                </div>
            )}
            {fromSpaceOwner && (
                <div className="space-y-2">
                    <p>From Space Owner</p>
                    <pre>{jsonStringify(fromSpaceOwner, 2)}</pre>
                </div>
            )}
        </>
    )
}
