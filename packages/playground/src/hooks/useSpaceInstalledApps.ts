import { useQuery } from '@tanstack/react-query'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { isChannelStreamId, makeBaseProvider, spaceIdFromChannelId } from '@towns-protocol/sdk'
import { type Address, AppRegistryDapp, SpaceDapp } from '@towns-protocol/web3'

export const getSpaceInstalledAppsQueryKey = (spaceId: string) => ['space-installed-apps', spaceId]

export const useSpaceInstalledApps = (streamId: string) => {
    const sync = useSyncAgent()
    const spaceId = isChannelStreamId(streamId) ? spaceIdFromChannelId(streamId) : streamId

    return useQuery({
        queryKey: getSpaceInstalledAppsQueryKey(spaceId),
        queryFn: async () => {
            const baseProvider = makeBaseProvider(sync.config.riverConfig)
            const riverConfig = sync.config.riverConfig
            const spaceDapp = new SpaceDapp(riverConfig.base.chainConfig, baseProvider)

            const space = spaceDapp.getSpace(spaceId)
            if (!space) {
                return []
            }
            const appRegistryDapp = new AppRegistryDapp(riverConfig.base.chainConfig, baseProvider)
            const installedApps = await space.AppAccount.read.getInstalledApps()
            return Promise.all(
                installedApps.map(async (address) => {
                    const appId = await appRegistryDapp.getLatestAppId(address as Address)
                    return appRegistryDapp.getAppById(appId)
                }),
            )
        },
        enabled: !!spaceId,
    })
}
