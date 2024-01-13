import { SpaceDappConfig } from '../SpaceDappTypes'
import { BigNumber } from 'ethers'
import { BundlerJsonRpcProvider, IUserOperation, Presets } from 'userop'
import { z } from 'zod'

type PaymasterProxyResponse = {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
}

const zSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    paymasterAndData: z.string().startsWith('0x'),
    preVerificationGas: z.string().startsWith('0x'),
    verificationGasLimit: z.string().startsWith('0x'),
    callGasLimit: z.string().startsWith('0x'),
})

type PaymasterProxyPostData = IUserOperation & {
    functionHash: string
    townId: string
}

export const paymasterProxyMiddleware: ({
    paymasterProxyAuthSecret,
}: {
    paymasterProxyAuthSecret: string
}) => SpaceDappConfig['paymasterMiddleware'] =
    ({ paymasterProxyAuthSecret }) =>
    async (args) => {
        const {
            userOpContext: ctx,
            bundlerUrl,
            provider,
            aaRpcUrl: rpcUrl,
            functionHashForPaymasterProxy,
            townId,
            paymasterProxyUrl,
        } = args

        async function fallbackEstimate() {
            if (provider) {
                await Presets.Middleware.estimateUserOperationGas(
                    new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(bundlerUrl),
                )(ctx)
            }
        }

        if (!paymasterProxyUrl) {
            console.warn(
                '[paymasterProxyMiddleware] paymasterProxyUrl is not set, using fallback gas estimate',
            )
            await fallbackEstimate()
            return
        }
        try {
            // ethers.BigNumberish types are:
            // nonce, callGasLimit, verificationGasLimit, preVerificationGas, maxFeePerGas, maxPriorityFeePerGas
            const bigNumberishTypes = [
                'nonce',
                'callGasLimit',
                'verificationGasLimit',
                'preVerificationGas',
                'maxFeePerGas',
                'maxPriorityFeePerGas',
            ] as const
            if (!functionHashForPaymasterProxy) {
                throw new Error('functionHashForPaymasterProxy is required')
            }
            if (!townId) {
                throw new Error('townId is required')
            }
            const userOp: PaymasterProxyPostData = {
                ...ctx.op,
                functionHash: functionHashForPaymasterProxy,
                townId: townId,
            }
            // convert all bigNumberish types to hex strings for paymaster proxy payload
            bigNumberishTypes.forEach((type) => {
                const value = userOp[type]
                userOp[type] = BigNumber.from(value).toHexString()
            })
            const sponsorUserOpUrl = `${paymasterProxyUrl}/api/sponsor-userop`
            const response = await fetch(sponsorUserOpUrl, {
                method: 'POST',
                body: JSON.stringify(userOp),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${paymasterProxyAuthSecret}`,
                },
            })
            const json = await response.json()
            const parseResult = zSchema.safeParse(json)
            if (!parseResult.success) {
                throw new Error(
                    `Error parsing PaymasterProxyResponse:: ${JSON.stringify(parseResult.error)}`,
                )
            }
            ctx.op.paymasterAndData = parseResult.data.paymasterAndData
            ctx.op.preVerificationGas = parseResult.data.preVerificationGas
            ctx.op.verificationGasLimit = parseResult.data.verificationGasLimit
            ctx.op.callGasLimit = parseResult.data.callGasLimit
        } catch (error: any) {
            // if the paymaster responds with an error
            // just estimate the gas the same way Presets.SimpleAccount does when no paymaster is passed
            // meaning a user will have to pay for gas and this can still fail if they don't have funds
            console.error(
                '[paymasterProxyMiddleware] Error getting paymaster proxy response, using fallback gas estimate',
                error,
            )
            await fallbackEstimate()
        }
    }
