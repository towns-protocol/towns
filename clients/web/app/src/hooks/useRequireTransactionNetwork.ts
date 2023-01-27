import { Chain, useNetwork, useSwitchNetwork } from 'wagmi'
import { useCorrectChainForServer } from './useCorrectChainForServer'

type Props = {
    onSuccess?: (chain: Chain) => void
    onError?: (error: Error) => void
}

export const useRequireTransactionNetwork = ({ onSuccess, onError }: Props = {}) => {
    const { chain } = useNetwork()
    const targetChain = useCorrectChainForServer()
    const { switchNetwork } = useSwitchNetwork({
        chainId: targetChain.id,
        onSuccess: (chain) => onSuccess?.(chain),
        onError: (error) => onError?.(error),
    })

    return {
        isTransactionNetwork: chain?.id === targetChain.id,
        name: targetChain.name,
        switchNetwork,
    }
}
