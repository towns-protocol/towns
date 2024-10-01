import { IUserOperationMiddlewareCtx } from 'userop'
import { Signer, utils } from 'ethers'

export async function signUserOpHash(ctx: IUserOperationMiddlewareCtx, signer: Signer) {
    ctx.op.signature = await signer.signMessage(utils.arrayify(ctx.getUserOpHash()))
}
