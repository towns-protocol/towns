import { FunctionHash, PaymasterErrorCode, UserOpsConfig } from '../../../types'
import { BigNumber, BigNumberish, utils } from 'ethers'
import { BundlerJsonRpcProvider, IUserOperation, IUserOperationMiddlewareCtx } from 'userop'
import { z } from 'zod'
import { CodeException } from '../../../errors'
import { isUsingAlchemyBundler } from '../../../utils/isUsingAlchemyBundler'
import { selectUserOpsByAddress, userOpsStore } from '../../../store/userOpsStore'
import { getPrivyLoginMethodFromLocalStorage } from '../../../utils/privyLoginMethod'
import { estimateGasFeesWithReplacement } from './estimateGasFees'
import { NON_SPONSORED_LOGIN_METHODS } from '../../../constants'
import { NON_SPONSORED_FUNCTION_HASHES } from '../../../constants'

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

export type PaymasterProxyPostData = IUserOperation & {
    rootKeyAddress: string
    functionHash: string
    townId: string | undefined
    gasOverrides: GasOverrides
}

type Multiplier = number

export type GasOverrides = {
    callGasLimit?: BigNumberish | Multiplier
    maxFeePerGas?: BigNumberish | Multiplier
    maxPriorityFeePerGas?: BigNumberish | Multiplier
    preVerificationGas?: BigNumberish | Multiplier
    verificationGasLimit?: BigNumberish | Multiplier
}

export const paymasterProxyMiddleware = async (
    args: {
        userOpContext: IUserOperationMiddlewareCtx
        rootKeyAddress: string
        bundlerUrl: string
        provider: BundlerJsonRpcProvider
        fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    } & Pick<UserOpsConfig, 'paymasterProxyUrl' | 'paymasterProxyAuthSecret'>,
) => {
    const {
        userOpContext: ctx,
        rootKeyAddress,
        paymasterProxyAuthSecret,
        paymasterProxyUrl,
        fetchAccessTokenFn,
        bundlerUrl,
    } = args
    const { current, pending } = selectUserOpsByAddress(args.userOpContext.op.sender)

    const value = current.value
    const pendingHash = pending.hash
    const { functionHashForPaymasterProxy, spaceId } = current

    if (
        functionHashForPaymasterProxy &&
        NON_SPONSORED_FUNCTION_HASHES.includes(functionHashForPaymasterProxy)
    ) {
        return
    }

    if (value) {
        const bigNumber = BigNumber.from(value)
        if (bigNumber.gt(0) || bigNumber.isNegative()) {
            return
        }
    }

    const loginMethod = getPrivyLoginMethodFromLocalStorage()

    if (loginMethod && NON_SPONSORED_LOGIN_METHODS.includes(loginMethod)) {
        return
    }

    let maxFeePerGas: BigNumberish | undefined
    let maxPriorityFeePerGas: BigNumberish | undefined
    if (pendingHash) {
        // get the gas values
        const result = await estimateGasFeesWithReplacement({
            sender: args.userOpContext.op.sender,
            provider: args.provider,
        })
        maxFeePerGas = result.maxFeePerGas
        maxPriorityFeePerGas = result.maxPriorityFeePerGas
    }

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
            gasOverrides: {
                maxFeePerGas: maxFeePerGas ? utils.hexValue(maxFeePerGas) : undefined,
                maxPriorityFeePerGas: maxPriorityFeePerGas
                    ? utils.hexValue(maxPriorityFeePerGas)
                    : undefined,
            },
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
        const json: unknown = await response.json()

        if (!response.ok) {
            const errorParseResult = zErrorSchema.safeParse(json)

            if (errorParseResult.success) {
                userOpsStore
                    .getState()
                    .setRejectedSponsorshipReason(
                        ctx.op.sender,
                        errorParseResult.data.errorDetail.code,
                    )
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
