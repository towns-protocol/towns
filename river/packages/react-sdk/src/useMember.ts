import { Member, type MemberModel, Myself } from '@river-build/sdk'
import { useMemo } from 'react'
import { useObservable } from './useObservable'

import type { ObservableConfig } from './useObservable'
import { type ActionConfig, useAction } from './internals/useAction'

export const useMember = (
    member: Member | Myself,
    config?: ObservableConfig.FromObservable<MemberModel>,
) => {
    const observable = useMemo(() => (member instanceof Myself ? member.member : member), [member])
    const { data, ...rest } = useObservable(observable, config)
    return {
        ...data,
        ...rest,
    }
}

export const useSetEnsAddress = (
    member: Myself,
    config?: ActionConfig<Myself['setEnsAddress']>,
) => {
    const { action: setEnsAddress, ...rest } = useAction(member, 'setEnsAddress', config)
    return { setEnsAddress, ...rest }
}

export const useSetUsername = (member: Myself, config?: ActionConfig<Myself['setUsername']>) => {
    const { action: setUsername, ...rest } = useAction(member, 'setUsername', config)
    return { setUsername, ...rest }
}

export const useSetDisplayName = (
    member: Myself,
    config?: ActionConfig<Myself['setDisplayName']>,
) => {
    const { action: setDisplayName, ...rest } = useAction(member, 'setDisplayName', config)
    return { setDisplayName, ...rest }
}

export const useSetNft = (member: Myself, config?: ActionConfig<Myself['setNft']>) => {
    const { action: setNft, ...rest } = useAction(member, 'setNft', config)
    return { setNft, ...rest }
}
