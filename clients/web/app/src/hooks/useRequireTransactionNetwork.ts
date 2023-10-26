import { Chain, useNetwork } from 'wagmi'
import { useSwitchNetwork } from '@privy-io/wagmi-connector'
import { useEnvironment } from './useEnvironmnet'

type Props = {
    onSuccess?: (chain: Chain) => void
    onError?: (error: Error) => void
}

// With Privy, user should always be on the correct network in a non-DEV environment, b/c of PrivyProvider config
// and we aren't exposing any way to change networks in the UI.
// However, in DEV, we may be on the wrong network, and things will still fail, so we need to check
// devs can still switch networks via the DebugBar
export const useRequireTransactionNetwork = ({ onSuccess, onError }: Props = {}) => {
    const { chain } = useNetwork()
    const { chainId: targetChainId, chainName: targetChainName } = useEnvironment()
    const { switchNetwork } = useSwitchNetwork({
        chainId: targetChainId,
        onSuccess: (chain) => onSuccess?.(chain),
        onError: (error) => onError?.(error),
    })

    return {
        isReady: chain !== undefined,
        isTransactionNetwork: chain?.id === targetChainId,
        name: targetChainName,
        switchNetwork,
    }
}
