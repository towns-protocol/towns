import { BundlerJsonRpcProvider, IUserOperation, IUserOperationMiddlewareCtx } from 'userop'
import { isUsingAlchemyBundler, OpToJSON } from '../utils'
import { GasEstimate } from '../types'

export const estimateUserOperationGas = async (
    ctx: IUserOperationMiddlewareCtx,
    provider: BundlerJsonRpcProvider,
    bundlerUrl: string,
) => {
    let op:
        | IUserOperation
        | Pick<
              IUserOperation,
              'sender' | 'nonce' | 'initCode' | 'callData' | 'paymasterAndData' | 'signature'
          > = OpToJSON(ctx.op)

    if (isUsingAlchemyBundler(bundlerUrl)) {
        op = {
            sender: op.sender,
            nonce: op.nonce,
            initCode: op.initCode,
            callData: op.callData,
            paymasterAndData: op.paymasterAndData,
            signature: op.signature,
        }
    }

    const est = (await provider.send('eth_estimateUserOperationGas', [
        op,
        ctx.entryPoint,
        // make sure to include stateOverrides for users w/o funds!
        ctx.stateOverrides,
    ])) as GasEstimate

    return est
}
