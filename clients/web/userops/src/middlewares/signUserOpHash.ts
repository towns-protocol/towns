import { IUserOperationMiddlewareCtx } from 'userop'
import { Signer, utils } from 'ethers'

export async function signUserOpHash(ctx: IUserOperationMiddlewareCtx, signer: Signer) {
    // try wrapping privy's call to iframe in a promise and rejecting the error
    // instead of letting it throw - this might be a source of app crashes
    const p = new Promise<utils.BytesLike>((resolve, reject) => {
        signer
            .signMessage(utils.arrayify(ctx.getUserOpHash()))
            .then(resolve)
            .catch((err) => {
                if (err instanceof Error) {
                    Object.defineProperty(err, 'preventDefault', { value: () => {} })
                    Object.defineProperty(err, 'stopPropagation', { value: () => {} })
                }
                reject(err)
            })
    })

    ctx.op.signature = await p
}
