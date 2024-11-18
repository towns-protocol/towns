import { FunctionHash, UserOpsConfig } from '../types'
import { BigNumber } from 'ethers'
import { IUserOperation, IUserOperationMiddlewareCtx } from 'userop'
import { z } from 'zod'
import { CodeException } from '../errors'
import { isUsingAlchemyBundler } from '../utils'
import { PaymasterErrorCode, userOpsStore } from '../userOpsStore'
import { getPrivyLoginMethodFromLocalStorage } from './privyLoginMethod'

type PaymasterProxyResponse = {
    data: {
        paymasterAndData: string
        preVerificationGas: string
        verificationGasLimit: string
        callGasLimit: string
        maxPriorityFeePerGas?: string
        maxFeePerGas?: string
    }
}

const zSuccessSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    data: z.object({
        paymasterAndData: z.string().startsWith('0x'),
        preVerificationGas: z.string().startsWith('0x'),
        verificationGasLimit: z.string().startsWith('0x'),
        callGasLimit: z.string().startsWith('0x'),
        maxPriorityFeePerGas: z.string().startsWith('0x').optional(),
        maxFeePerGas: z.string().startsWith('0x').optional(),
    }),
})

const zErrorSchema: z.ZodType<{ errorDetail: { code: PaymasterErrorCode } }> = z.object({
    errorDetail: z.object({
        code: z.nativeEnum(PaymasterErrorCode),
    }),
})

type PaymasterProxyPostData = IUserOperation & {
    rootKeyAddress: string
    functionHash: string
    townId: string | undefined
}

const NON_SPONSORED_LOGIN_METHODS = ['email']

export const paymasterProxyMiddleware = async (
    args: {
        userOpContext: IUserOperationMiddlewareCtx
        rootKeyAddress: string
        functionHashForPaymasterProxy: FunctionHash | undefined
        spaceId: string | undefined
        bundlerUrl: string
        fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    } & Pick<UserOpsConfig, 'paymasterProxyUrl' | 'paymasterProxyAuthSecret'>,
) => {
    const loginMethod = getPrivyLoginMethodFromLocalStorage()

    if (loginMethod && NON_SPONSORED_LOGIN_METHODS.includes(loginMethod)) {
        return
    }

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

        const doNotRequireSpaceId: FunctionHash[] = [
            'createSpace',
            'createSpaceWithPrepay',
            'createSpace_linkWallet',
            'linkWalletToRootKey',
            'linkCallerToRootKey',
            'removeLink',
            'transferTokens',
            'withdraw',
        ]

        if (!spaceId && !doNotRequireSpaceId.includes(functionHashForPaymasterProxy)) {
            const errorMessage = `[paymasterProxyMiddleware] spaceId is required for all user operations except ${doNotRequireSpaceId.join(
                ', ',
            )}`
            console.error(errorMessage)
            throw new Error(errorMessage)
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

        if (isUsingAlchemyBundler(bundlerUrl)) {
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
            const errorParseResult = zErrorSchema.safeParse(json)

            if (errorParseResult.success) {
                userOpsStore
                    .getState()
                    .setRejectedSponsorshipReason(errorParseResult.data.errorDetail.code)
            } else {
                console.log(
                    '[paymasterProxyMiddleware] errorParseResult.error, error may be missing in PaymasterErrorCode',
                )
            }

            throw new Error(
                `[paymasterProxyMiddleware] Error getting paymaster proxy response:: ${
                    response.status
                } ${response.statusText} ${JSON.stringify(json)}`,
            )
        }

        const parseResult = zSuccessSchema.safeParse(json)
        if (!parseResult.success) {
            throw new Error(
                `[paymasterProxyMiddleware] Error parsing PaymasterProxyResponse:: ${JSON.stringify(
                    parseResult.error,
                )}`,
            )
        }

        const parsedData = parseResult.data.data

        // the op needs to be updated with the values returned from the paymaster call
        // if paymaster returns a response that includes fields that are missing here
        // then you'll likely encounter an invalid paymaster signature error
        // https://docs.stackup.sh/reference/pm-sponsoruseroperation
        // being explicity here instead of spreading the parseResult.data, for clarity
        ctx.op.paymasterAndData = parsedData.paymasterAndData
        ctx.op.preVerificationGas = parsedData.preVerificationGas
        ctx.op.verificationGasLimit = parsedData.verificationGasLimit
        ctx.op.callGasLimit = parsedData.callGasLimit

        // alchemy returns these as well, so we need to set them here
        // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
        if (parsedData.maxFeePerGas && parsedData.maxPriorityFeePerGas) {
            ctx.op.maxFeePerGas = parsedData.maxFeePerGas
            ctx.op.maxPriorityFeePerGas = parsedData.maxPriorityFeePerGas
        }
    } catch (error) {
        console.error('[paymasterProxyMiddleware] error', error)
    }
}
