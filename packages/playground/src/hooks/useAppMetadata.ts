import { useQuery } from '@tanstack/react-query'
import { AppRegistryService, townsEnv } from '@towns-protocol/sdk'
import { useSyncAgent } from '@towns-protocol/react-sdk'
import { bin_fromHexString } from '@towns-protocol/utils'
import { useEthersSigner } from '@/utils/viem-to-ethers'
import { loadAuth } from '@/utils/persist-auth'
import { VITE_ENV_OPTIONS } from '@/utils/environment'

export const getAppMetadataQueryKey = (appId: string) => ['appMetadata', appId]

export const useAppMetadata = (appId: string | undefined) => {
    const signer = useEthersSigner()
    const sync = useSyncAgent()
    const appRegistryUrl = townsEnv(VITE_ENV_OPTIONS).getAppRegistryUrl(
        sync.config.townsConfig.environmentId,
    )

    return useQuery({
        queryKey: getAppMetadataQueryKey(appId || ''),
        queryFn: async () => {
            const signerContext = loadAuth()?.signerContext
            if (!appId || !signer || !signerContext) {
                throw new Error('Missing required parameters')
            }

            const { appRegistryRpcClient } = await AppRegistryService.authenticate(
                signerContext,
                appRegistryUrl,
            )

            const response = await appRegistryRpcClient.getAppMetadata({
                appId: bin_fromHexString(appId),
            })

            return response.metadata
        },
        enabled: !!appId && !!signer,
    })
}
