import { userOpsStore } from '../userOpsStore'
import { IUserOperationMiddlewareCtx } from 'userop'
import { FunctionHash } from '../types'
import { BigNumberish } from 'ethers'
import { TownsSimpleAccount } from '../TownsSimpleAccount'
import { Space } from '@river-build/web3'

/**
 * Set the confirm and deny functions in the userOpsStore
 * Subscribe to the userOpsStore to update the UI
 */
export function saveOpToUserOpsStore(
    ctx: IUserOperationMiddlewareCtx,
    type: FunctionHash | undefined,
    value: BigNumberish | undefined,
    builder: TownsSimpleAccount,
    space: Space | undefined,
) {
    userOpsStore.getState().saveOp({
        op: ctx.op,
        type,
        value,
        builder,
        space,
    })
}
