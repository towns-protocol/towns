import { foundry, goerli } from 'wagmi/chains'
import { useMemo } from 'react'
import { env } from 'utils'

import { HomeServerUrl, useMatrixHomeServerUrl } from './useMatrixHomeServerUrl'

// transactions should always be against a specific chain
// in prod, this is always goerli
// in dev, this could be foundry or goerli, depending on where your server is pointed
export const useCorrectChainForServer = () => {
    const { homeserverUrl } = useMatrixHomeServerUrl()
    const chain = useMemo(
        () => (!env.IS_DEV ? goerli : homeserverUrl === HomeServerUrl.REMOTE ? goerli : foundry),
        [homeserverUrl],
    )
    return chain
}
