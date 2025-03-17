import { decodeCallData, selectUserOpsByAddress, userOpsStore } from '@towns/userops'

import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'

export function useDecodedCallData() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data

    const current = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.current,
    )

    const currOpDecodedCallData =
        current?.op?.callData && current.functionHashForPaymasterProxy
            ? decodeCallData({
                  callData: current.op.callData,
                  functionHash: current.functionHashForPaymasterProxy,
              })
            : undefined

    return currOpDecodedCallData
}
