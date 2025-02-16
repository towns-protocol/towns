import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'

export function useIsJoinSpace() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.current?.decodedCallData,
    )
    return (
        currOpDecodedCallData?.functionHash === 'joinSpace' ||
        currOpDecodedCallData?.functionHash === 'joinSpace_linkWallet'
    )
}
