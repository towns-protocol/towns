import { Chain, useNetwork, useSwitchNetwork } from 'wagmi'
import { useEnvironment } from './useEnvironmnet'

type Props = {
    onSuccess?: (chain: Chain) => void
    onError?: (error: Error) => void
}

export const useRequireTransactionNetwork = ({ onSuccess, onError }: Props = {}) => {
    const { chain } = useNetwork()
    const { chainId: targetChainId, chainName: targetChainName } = useEnvironment()
    const { switchNetwork } = useSwitchNetwork({
        chainId: targetChainId,
        onSuccess: (chain) => onSuccess?.(chain),
        onError: (error) => onError?.(error),
    })

    return {
        isTransactionNetwork: chain?.id === targetChainId,
        name: targetChainName,
        switchNetwork,
    }
}
