import { UserOpsConfig } from './types'
import { BigNumber } from 'ethers'
import { IUserOperation, IUserOperationMiddlewareCtx } from 'userop'
import { z } from 'zod'
import { CodeException } from './errors'

type PaymasterProxyResponse = {
    paymasterAndData: string
    preVerificationGas: string
    verificationGasLimit: string
    callGasLimit: string
    maxPriorityFeePerGas?: string
    maxFeePerGas?: string
}

const zSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    paymasterAndData: z.string().startsWith('0x'),
    preVerificationGas: z.string().startsWith('0x'),
    verificationGasLimit: z.string().startsWith('0x'),
    callGasLimit: z.string().startsWith('0x'),
    maxPriorityFeePerGas: z.string().startsWith('0x').optional(),
    maxFeePerGas: z.string().startsWith('0x').optional(),
})

type PaymasterProxyPostData = IUserOperation & {
    rootKeyAddress: string
    functionHash: string
    townId: string | undefined
}

export const paymasterProxyMiddleware = async (
    args: {
        userOpContext: IUserOperationMiddlewareCtx
        rootKeyAddress: string
        functionHashForPaymasterProxy: string | undefined
        spaceId: string | undefined
        bundlerUrl: string
        fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    } & Pick<UserOpsConfig, 'paymasterProxyUrl' | 'paymasterProxyAuthSecret'>,
) => {
    const {
        userOpContext: ctx,
        rootKeyAddress,
        functionHashForPaymasterProxy,
        spaceId,
        paymasterProxyAuthSecret,
        paymasterProxyUrl,
        fetchAccessTokenFn,
        bundlerUrl,
    } = args

    try {
        // TODO: ///////////////////////////
        // check here if the tx is a joinTown,
        // if so, check if there's a membership price
        // if so, check if the user has enough funds
        // if not enough funds, show the confirmation modal here first?
        ////////////////////////////////////

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

        if (
            !spaceId &&
            functionHashForPaymasterProxy !== 'createSpace' &&
            functionHashForPaymasterProxy !== 'createSpace_linkWallet' &&
            functionHashForPaymasterProxy !== 'linkWalletToRootKey' &&
            functionHashForPaymasterProxy !== 'linkCallerToRootKey' &&
            functionHashForPaymasterProxy !== 'removeLink'
        ) {
            throw new Error(
                '[paymasterProxyMiddleware] townId is required for all user operations except createSpace, linkWallet, and removeLink',
            )
        }

        const data: PaymasterProxyPostData = {
            ...ctx.op,
            functionHash: functionHashForPaymasterProxy,
            rootKeyAddress: rootKeyAddress,
            townId: spaceId,
        }
        // convert all bigNumberish types to hex strings for paymaster proxy payload
        bigNumberishTypes.forEach((type) => {
            const value = data[type]
            data[type] = BigNumber.from(value).toHexString()
        })

        let sponsorUserOpUrl = `${paymasterProxyUrl}/api/sponsor-userop`

        if (bundlerUrl.includes('alchemy')) {
            sponsorUserOpUrl = `${paymasterProxyUrl}/api/sponsor-userop/alchemy`
        }

        let accessToken: string | undefined
        try {
            accessToken = (await fetchAccessTokenFn?.()) ?? undefined
        } catch (error) {
            throw new CodeException({
                message: 'Failed to get access token',
                code: 'USER_OPS_FAILED_ACCESS_TOKEN',
                data: error,
                category: 'userop',
            })
        }

        const response = await fetch(sponsorUserOpUrl, {
            method: 'POST',
            body: JSON.stringify({
                data,
            }),
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${paymasterProxyAuthSecret}`,
                'X-PM-Token': accessToken ?? '',
            },
        })
        const json = await response.json()

        if (!response.ok) {
            throw new Error(
                `[paymasterProxyMiddleware] Error getting paymaster proxy response:: ${
                    response.status
                } ${response.statusText} ${JSON.stringify(json)}`,
            )
        }

        const parseResult = zSchema.safeParse(json)
        if (!parseResult.success) {
            throw new Error(
                `[paymasterProxyMiddleware] Error parsing PaymasterProxyResponse:: ${JSON.stringify(
                    parseResult.error,
                )}`,
            )
        }

        // the op needs to be updated with the values returned from the paymaster call
        // if paymaster returns a response that includes fields that are missing here
        // then you'll likely encounter an invalid paymaster signature error
        // https://docs.stackup.sh/reference/pm-sponsoruseroperation
        // being explicity here instead of spreading the parseResult.data, for clarity
        ctx.op.paymasterAndData = parseResult.data.paymasterAndData
        ctx.op.preVerificationGas = parseResult.data.preVerificationGas
        ctx.op.verificationGasLimit = parseResult.data.verificationGasLimit
        ctx.op.callGasLimit = parseResult.data.callGasLimit

        // alchemy returns these as well, so we need to set them here
        // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
        if (parseResult.data.maxFeePerGas && parseResult.data.maxPriorityFeePerGas) {
            ctx.op.maxFeePerGas = parseResult.data.maxFeePerGas
            ctx.op.maxPriorityFeePerGas = parseResult.data.maxPriorityFeePerGas
        }
    } catch (error) {
        // if the paymaster responds with an error
        // just estimate the gas the same way Presets.SimpleAccount does when no paymaster is passed
        // meaning a user will have to pay for gas and this can still fail if they don't have funds
        // console.error('[paymasterProxyMiddleware] using fallback gas estimate:', error)
        // await waitForConfirmOrDeny()
    }
}
