import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function useIsJoinSpace() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const functionHash = userOpsStore(
        (s) =>
            selectUserOpsByAddress(myAbstractAccountAddress, s)?.current
                ?.functionHashForPaymasterProxy,
    )
    return functionHash === 'joinSpace' || functionHash === 'joinSpace_linkWallet'
}
