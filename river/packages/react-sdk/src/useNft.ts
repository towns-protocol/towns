import type { Member, MemberNft, Myself } from '@river-build/sdk'
import { ObservableConfig, useObservable } from './useObservable'
import { type ActionConfig, useAction } from './internals/useAction'

export const useNft = (member: Member, config?: ObservableConfig.FromObservable<MemberNft>) => {
    const { data, ...rest } = useObservable(member?.observables.nft, config)
    return {
        ...data,
        ...rest,
    }
}

export const useSetNft = (member: Myself, config?: ActionConfig<Myself['setNft']>) => {
    const { action, ...rest } = useAction(member, 'setNft', config)
    return { setNft: action, ...rest }
}
