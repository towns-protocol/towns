import type { Member, MemberDisplayName, Myself } from '@river-build/sdk'
import { ObservableConfig, useObservable } from './useObservable'
import { type ActionConfig, useAction } from './internals/useAction'

export const useDisplayName = (
    member: Member,
    config?: ObservableConfig.FromObservable<MemberDisplayName>,
) => {
    const { data, ...rest } = useObservable(member?.observables.displayName, config)
    return {
        ...data,
        ...rest,
    }
}

export const useSetDisplayName = (
    member: Myself,
    config?: ActionConfig<Myself['setDisplayName']>,
) => {
    const { action, ...rest } = useAction(member, 'setDisplayName', config)
    return { setDisplayName: action, ...rest }
}
