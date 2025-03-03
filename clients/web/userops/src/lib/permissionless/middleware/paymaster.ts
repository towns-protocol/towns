import { FunctionHash, PaymasterErrorCode, UserOpsConfig } from '../../../types'
import { z } from 'zod'
import { CodeException } from '../../../errors'
import { isUsingAlchemyBundler } from '../../../utils/isUsingAlchemyBundler'
import { selectUserOpsByAddress, userOpsStore } from '../../../store/userOpsStore'
import { estimateGasFeesWithReplacement } from './estimateGasFees'
import { PrepareUserOperationRequest, UserOperation } from 'viem/account-abstraction'
import { BigNumber, BigNumberish } from 'ethers'
import { Hex, hexToBigInt, isHex, Client, toHex } from 'viem'
import { getPrivyLoginMethodFromLocalStorage } from '../../../utils/privyLoginMethod'
import { NON_SPONSORED_LOGIN_METHODS } from '../../../constants'
import { NON_SPONSORED_FUNCTION_HASHES } from '../../../constants'

type PaymasterProxyResponse = {
    data: {
        paymasterAndData: Hex
        preVerificationGas: Hex
        verificationGasLimit: Hex
        callGasLimit: Hex
        maxPriorityFeePerGas?: Hex
        maxFeePerGas?: Hex
    }
}

const zAddress = z.custom<Hex>((val) => typeof val === 'string' && isHex(val))

const zSuccessSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    data: z.object({
        paymasterAndData: zAddress,
        preVerificationGas: zAddress,
        verificationGasLimit: zAddress,
        callGasLimit: zAddress,
        maxPriorityFeePerGas: zAddress.optional(),
        maxFeePerGas: zAddress.optional(),
    }),
})

const zErrorSchema: z.ZodType<{ errorDetail: { code: PaymasterErrorCode } }> = z.object({
    errorDetail: z.object({
        code: z.nativeEnum(PaymasterErrorCode),
    }),
})

export type PaymasterProxyPostData = Omit<
    UserOperation<'0.6'>,
    | 'nonce'
    | 'callGasLimit'
    | 'verificationGasLimit'
    | 'preVerificationGas'
    | 'maxFeePerGas'
    | 'maxPriorityFeePerGas'
> & {
    rootKeyAddress: string
    functionHash: string
    townId: string | undefined
    gasOverrides: GasOverrides
    nonce: BigNumberish
    callGasLimit: BigNumberish
    verificationGasLimit: BigNumberish
    preVerificationGas: BigNumberish
    maxFeePerGas: BigNumberish
    maxPriorityFeePerGas: BigNumberish
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
        userOp: PrepareUserOperationRequest
        rootKeyAddress: string
        bundlerUrl: string
        client: Client
        fetchAccessTokenFn: (() => Promise<string | null>) | undefined
    } & Pick<UserOpsConfig, 'paymasterProxyUrl' | 'paymasterProxyAuthSecret'>,
) => {
    const {
        rootKeyAddress,
        paymasterProxyAuthSecret,
        paymasterProxyUrl,
        fetchAccessTokenFn,
        bundlerUrl,
    } = args
    const { current, pending } = selectUserOpsByAddress(args.userOp.sender)

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

    let maxFeePerGas: bigint | undefined
    let maxPriorityFeePerGas: bigint | undefined

    if (pendingHash && args.userOp.sender) {
        // get the gas values
        const result = await estimateGasFeesWithReplacement({
            sender: args.userOp.sender,
            client: args.client,
        })
        maxFeePerGas = result.maxFeePerGas
        maxPriorityFeePerGas = result.maxPriorityFeePerGas
    }

    try {
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

        const op = args.userOp

        if (
            !op.callData ||
            op.preVerificationGas === undefined ||
            !op.sender ||
            !op.signature ||
            op.nonce === undefined ||
            op.callGasLimit === undefined ||
            op.verificationGasLimit === undefined ||
            op.maxFeePerGas === undefined ||
            op.maxPriorityFeePerGas === undefined
        ) {
            throw new Error('Invalid user operation')
        }

        const data: PaymasterProxyPostData = {
            callData: op.callData,
            callGasLimit: toHex(op.callGasLimit),
            initCode: op.initCode,
            maxFeePerGas: toHex(op.maxFeePerGas),
            maxPriorityFeePerGas: toHex(op.maxPriorityFeePerGas),
            nonce: toHex(op.nonce),
            preVerificationGas: toHex(op.preVerificationGas),
            sender: op.sender,
            signature: op.signature,
            verificationGasLimit: toHex(op.verificationGasLimit),
            functionHash: functionHashForPaymasterProxy,
            rootKeyAddress: rootKeyAddress,
            townId: spaceId,
            paymasterAndData: '0x',
            gasOverrides: {
                maxFeePerGas: maxFeePerGas ? toHex(maxFeePerGas) : undefined,
                maxPriorityFeePerGas: maxPriorityFeePerGas
                    ? toHex(maxPriorityFeePerGas)
                    : undefined,
            },
        }

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
                    .setRejectedSponsorshipReason(op.sender, errorParseResult.data.errorDetail.code)
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
        const gas = {
            paymasterAndData: parsedData.paymasterAndData,
            preVerificationGas: hexToBigInt(parsedData.preVerificationGas),
            verificationGasLimit: hexToBigInt(parsedData.verificationGasLimit),
            callGasLimit: hexToBigInt(parsedData.callGasLimit),
        }

        if (parsedData.maxFeePerGas && parsedData.maxPriorityFeePerGas) {
            // alchemy returns these as well, so we need to set them here
            // https://docs.alchemy.com/reference/alchemy-requestgasandpaymasteranddata
            return {
                ...gas,
                maxFeePerGas: parsedData.maxFeePerGas
                    ? hexToBigInt(parsedData.maxFeePerGas)
                    : undefined,
                maxPriorityFeePerGas: parsedData.maxPriorityFeePerGas
                    ? hexToBigInt(parsedData.maxPriorityFeePerGas)
                    : undefined,
            }
        }

        return gas
    } catch (error) {
        console.error('[paymasterProxyMiddleware] error', error)
    }
}
