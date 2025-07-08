import { useQuery } from '@tanstack/react-query'
import { AppRegistryService, getAppRegistryUrl } from '@towns-protocol/sdk'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { bin_fromHexString } from '@towns-protocol/dlog'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { loadAuth } from '@/utils/persist-auth'

export const getAppMetadataQueryKey = (appId: string) => ['appMetadata', appId]

export const useAppMetadata = (appId: string | undefined) => {
    const signer = useEthersSigner()
    const sync = useSyncAgent()

    return useQuery({
        queryKey: getAppMetadataQueryKey(appId || ''),
        queryFn: async () => {
            const signerContext = loadAuth()?.signerContext
            if (!appId || !signer || !signerContext) {
                throw new Error('Missing required parameters')
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticate(
                signerContext,
                getAppRegistryUrl(sync.config.riverConfig.environmentId),
            )

            const response = await appRegistryRpcClient.getAppMetadata({
                appId: bin_fromHexString(appId),
            })

            return response.metadata
        },
        enabled: !!appId && !!signer,
    })
}
