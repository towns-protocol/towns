import { useQuery } from '@tanstack/react-query'
import { useSyncAgent, useTowns } from '@towns-protocol/react-sdk'
import { type Address, AppRegistryDapp } from '@towns-protocol/web3'
import { makeBaseProvider } from '@towns-protocol/sdk'

export const getAllBotsQueryKey = (userId: string) => ['all-bots', userId] as const

export const useAllBots = () => {
    const sync = useSyncAgent()
    const { data: user } = useTowns((s) => s.user)

    return useQuery({
        queryKey: getAllBotsQueryKey(user.id ?? ''),
        queryFn: async () => {
            if (!user.id) {
                return []
            }

            const baseProvider = makeBaseProvider(sync.config.townsConfig)
            const townsConfig = sync.config.townsConfig
            const appRegistryDapp = new AppRegistryDapp(townsConfig.base.chainConfig, baseProvider)
            return appRegistryDapp.getAllAppsByOwner(user.id as Address)
        },
        enabled: !!sync.userId,
    })
}
