import type { Member, MemberUsername, Myself } from '@river-build/sdk'
import { ObservableConfig, useObservable } from './useObservable'
import { type ActionConfig, useAction } from './internals/useAction'

export const useUsername = (
    member: Member,
    config?: ObservableConfig.FromObservable<MemberUsername>,
) => {
    const { data, ...rest } = useObservable(member?.observables.username, config)
    return {
        ...data,
        ...rest,
    }
}

export const useSetUsername = (member: Myself, config?: ActionConfig<Myself['setUsername']>) => {
    const { action: setUsername, ...rest } = useAction(member, 'setUsername', config)
    return { setUsername, ...rest }
}
