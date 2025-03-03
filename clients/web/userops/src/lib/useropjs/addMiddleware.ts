import { promptUser } from '../../store/promptUser'
import { SpaceDapp } from '@river-build/web3'
import { balanceOf, totalCostOfUserOp } from './middlewares/balance'
import { estimateGasLimit } from './middlewares/estimateGasLimit'

import { paymasterProxyMiddleware } from './middlewares/paymasterProxyMiddleware'
import { subtractGasFromBalance } from './middlewares/substractGasFromValue'
import { isSponsoredOp } from '../../utils/isSponsoredOp'
import { TimeTracker } from '../../types'
import { isUsingAlchemyBundler } from '../../utils/isUsingAlchemyBundler'
import { OpToJSON } from '../../utils/opToJson'
import { TownsSimpleAccount } from './TownsSimpleAccount'
import { userOpsStore, selectUserOpsByAddress } from '../../store/userOpsStore'
import { Signer } from 'ethers'
import { InsufficientTipBalanceException } from '../../errors'
import { Hex } from 'viem'
import { estimateGasFeesMiddleware } from './middlewares/estimateGasFees'
import { signUserOpHash } from './middlewares/signUserOpHash'

export function addMiddleware({
    builder,
    signer,
    bundlerUrl,
    paymasterProxyUrl,
    paymasterProxyAuthSecret,
    fetchAccessTokenFn,
    timeTracker,
    spaceDapp,
}: {
    builder: TownsSimpleAccount
    signer: Signer
    bundlerUrl: string
    paymasterProxyUrl: string | undefined
    paymasterProxyAuthSecret: string | undefined
    fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    timeTracker: TimeTracker | undefined
    spaceDapp: SpaceDapp | undefined
}) {
    // stackup bundler (local dev)
    // stackup paymaster requires gas fee estimates to be included in the user operation
    // alchemy bundler does not require gas fee estimates b/c we are using alchemy_requestGasAndPaymasterAndData in the paymaster proxy server
    // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
    builder
        .useMiddleware(async (ctx) => {
            if (!isUsingAlchemyBundler(bundlerUrl)) {
                return estimateGasFeesMiddleware(ctx, builder.provider)
            }
        })
        // pass user op with new gas data to paymaster.
        // If approved, paymaster returns preverification gas and we assign it to the user operation.
        // The userop fields can no longer be manipulated or else the paymaster sig will be invalid
        //
        // If rejected, gas must be estimated in later middleware
        .useMiddleware(async (ctx) => {
            if (paymasterProxyUrl && paymasterProxyAuthSecret) {
                const { sequenceName, current } = selectUserOpsByAddress(ctx.op.sender)

                let endPaymasterMiddleware: (() => void) | undefined

                if (sequenceName) {
                    endPaymasterMiddleware = timeTracker?.startMeasurement(
                        sequenceName,
                        `userops_${current.functionHashForPaymasterProxy}_paymasterProxyMiddleware`,
                    )
                }
                await paymasterProxyMiddleware({
                    rootKeyAddress: await signer.getAddress(),
                    userOpContext: ctx,
                    paymasterProxyAuthSecret,
                    paymasterProxyUrl,
                    bundlerUrl,
                    provider: builder.provider,
                    fetchAccessTokenFn,
                })

                endPaymasterMiddleware?.()
            }
        })
        .useMiddleware(async (ctx) => {
            if (isUsingAlchemyBundler(bundlerUrl)) {
                if (
                    isSponsoredOp({
                        paymasterAndData: ctx.op.paymasterAndData as Hex,
                    })
                ) {
                    return
                }
                return estimateGasFeesMiddleware(ctx, builder.provider)
            }
        })
        .useMiddleware(async (ctx) => {
            const { current } = selectUserOpsByAddress(ctx.op.sender)
            const { spaceId, functionHashForPaymasterProxy } = current
            if (
                isSponsoredOp({
                    paymasterAndData: ctx.op.paymasterAndData as Hex,
                })
            ) {
                return
            }
            return estimateGasLimit({
                ctx,
                provider: builder.provider,
                bundlerUrl,
                spaceId,
                spaceDapp,
                functionHashForPaymasterProxy: functionHashForPaymasterProxy,
            })
        })
        // we have gas limits, estimates paymaster, nonce, etc now, so update the current op
        .useMiddleware(async (ctx) => {
            userOpsStore.getState().setCurrent({
                sender: ctx.op.sender,
                op: OpToJSON(ctx.op),
            })
            await Promise.resolve()
        })
        // prompt user if the paymaster rejected
        .useMiddleware(async (ctx) => {
            if (
                isSponsoredOp({
                    paymasterAndData: ctx.op.paymasterAndData as Hex,
                })
            ) {
                return
            }
            const { current } = selectUserOpsByAddress(ctx.op.sender)

            // tip is a special case
            // - it is not sponsored
            // - it will make tx without prompting user
            // - we only want to prompt user if not enough balance in sender wallet
            if (current.functionHashForPaymasterProxy === 'tip') {
                const op = ctx.op
                const totalCost = totalCostOfUserOp({
                    gasLimit: op.callGasLimit,
                    preVerificationGas: op.preVerificationGas,
                    verificationGasLimit: op.verificationGasLimit,
                    gasPrice: op.maxFeePerGas,
                    value: current.value,
                })
                const balance = await balanceOf(op.sender, builder.provider)

                if (balance.lt(totalCost)) {
                    throw new InsufficientTipBalanceException()
                }
            } else {
                await promptUser(ctx.op.sender)
            }
        })
        .useMiddleware(async (ctx) => {
            const { current } = selectUserOpsByAddress(ctx.op.sender)
            const { functionHashForPaymasterProxy, value } = current

            if (value && functionHashForPaymasterProxy === 'transferEth') {
                return subtractGasFromBalance(ctx, {
                    functionHash: functionHashForPaymasterProxy,
                    builder,
                    value,
                })
            }
        })
        .useMiddleware(async (ctx) => signUserOpHash(ctx, signer))
}
