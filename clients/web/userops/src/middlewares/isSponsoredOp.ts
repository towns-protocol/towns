import { IUserOperationMiddlewareCtx } from 'userop'

export function isSponsoredOp(ctx: IUserOperationMiddlewareCtx) {
    return ctx.op.paymasterAndData !== '0x'
}
