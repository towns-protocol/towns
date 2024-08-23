import type { Member, MemberEnsAddress, Myself } from '@river-build/sdk'
import { ObservableConfig, useObservable } from './useObservable'
import { type ActionConfig, useAction } from './internals/useAction'

export const useEnsAddress = (
    member: Member,
    config?: ObservableConfig.FromObservable<MemberEnsAddress>,
) => {
    const { data, ...rest } = useObservable(member?.observables.ensAddress, config)
    return {
        ...data,
        ...rest,
    }
}

export const useSetEnsAddress = (
    member: Myself,
    config?: ActionConfig<Myself['setEnsAddress']>,
) => {
    const { action, ...rest } = useAction(member, 'setEnsAddress', config)
    return { setEnsAddress: action, ...rest }
}
