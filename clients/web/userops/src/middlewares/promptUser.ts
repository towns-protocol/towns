import { BigNumberish, BigNumber } from 'ethers'
import { userOpsStore } from '../userOpsStore'
import { CodeException } from '../errors'
import { IUserOperationMiddlewareCtx } from 'userop'

export function promptUser(ctx: IUserOperationMiddlewareCtx, value?: BigNumberish) {
    if (ctx.op.paymasterAndData !== '0x') {
        return
    }
    return new Promise((resolve, reject) => {
        const {
            preVerificationGas,
            verificationGasLimit,
            callGasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
        } = ctx.op
        userOpsStore.setState({
            currOpGas: {
                preverificationGas: preVerificationGas,
                verificationGasLimit,
                callGasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
            },
            currOpValue: value && BigNumber.from(value).gt(0) ? value : undefined,
            confirm: () => {
                userOpsStore.getState().clear()
                resolve('User confirmed!')
            },
            deny: () => {
                userOpsStore.getState().clear()
                reject(
                    new CodeException({
                        message: 'User rejected user operation',
                        code: 'ACTION_REJECTED',
                        category: 'misc',
                    }),
                )
            },
        })
    })
}
