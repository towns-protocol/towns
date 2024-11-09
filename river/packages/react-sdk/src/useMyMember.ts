import type { Member, Myself, SyncAgent } from '@river-build/sdk'
import { useMemo } from 'react'
import { type ActionConfig, useAction } from './internals/useAction'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'
import { getRoom } from './utils'

const getMyMember = (sync: SyncAgent, streamId: string) => getRoom(sync, streamId).members.myself

export const useMyMember = (streamId: string, config?: ObservableConfig.FromObservable<Member>) => {
    const sync = useSyncAgent()
    const myself = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { data } = useObservable(myself.member, config)
    return {
        ...data,
    }
}

export const useSetEnsAddress = (
    streamId: string,
    config?: ActionConfig<Myself['setEnsAddress']>,
) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setEnsAddress, ...rest } = useAction(member, 'setEnsAddress', config)
    return { setEnsAddress, ...rest }
}

export const useSetUsername = (streamId: string, config?: ActionConfig<Myself['setUsername']>) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setUsername, ...rest } = useAction(member, 'setUsername', config)
    return { setUsername, ...rest }
}

export const useSetDisplayName = (
    streamId: string,
    config?: ActionConfig<Myself['setDisplayName']>,
) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setDisplayName, ...rest } = useAction(member, 'setDisplayName', config)
    return { setDisplayName, ...rest }
}

export const useSetNft = (streamId: string, config?: ActionConfig<Myself['setNft']>) => {
    const sync = useSyncAgent()
    const member = useMemo(() => getMyMember(sync, streamId), [sync, streamId])
    const { action: setNft, ...rest } = useAction(member, 'setNft', config)
    return { setNft, ...rest }
}
