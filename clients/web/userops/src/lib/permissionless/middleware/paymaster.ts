import { FunctionHash, PaymasterErrorCode, UserOpsConfig } from '../../../types'
import { z } from 'zod'
import { CodeException } from '../../../errors'
import { isUsingAlchemyBundler } from '../../../utils/isUsingAlchemyBundler'
import { selectUserOpsByAddress, userOpsStore } from '../../../store/userOpsStore'
import { estimateGasFeesWithReplacement } from './estimateGasFees'
import {
    formatUserOperationRequest,
    PrepareUserOperationRequest,
    UserOperation,
} from 'viem/account-abstraction'
import { Hex, hexToBigInt, isHex, Client, toHex, RpcUserOperationRequest } from 'viem'
import { getPrivyLoginMethodFromLocalStorage } from '../../../utils/privyLoginMethod'
import { NON_SPONSORED_LOGIN_METHODS } from '../../../constants'
import { NON_SPONSORED_FUNCTION_HASHES } from '../../../constants'
import { decodeCallData } from '../../../utils/decodeCallData'

type Paymaster06Response = {
    paymasterAndData: Hex
    preVerificationGas: Hex
    verificationGasLimit: Hex
    callGasLimit: Hex
    maxPriorityFeePerGas?: Hex
    maxFeePerGas?: Hex
}

type Paymaster07Response = {
    preVerificationGas: Hex
    callGasLimit: Hex
    paymasterVerificationGasLimit: Hex
    paymasterPostOpGasLimit: Hex
    verificationGasLimit: Hex
    paymaster: Hex
    paymasterData: Hex
    maxPriorityFeePerGas?: Hex
    maxFeePerGas?: Hex
}

type PaymasterProxyResponse = {
    data: Paymaster06Response | Paymaster07Response
}

const zAddress = z.custom<Hex>((val) => typeof val === 'string' && isHex(val))

// Create Zod schemas based on the TypeScript types
const zPaymaster06Response: z.ZodType<Paymaster06Response> = z.object({
    paymasterAndData: zAddress,
    preVerificationGas: zAddress,
    verificationGasLimit: zAddress,
    callGasLimit: zAddress,
    maxPriorityFeePerGas: zAddress.optional(),
    maxFeePerGas: zAddress.optional(),
})

const zPaymaster07Response: z.ZodType<Paymaster07Response> = z.object({
    preVerificationGas: zAddress,
    callGasLimit: zAddress,
    paymasterVerificationGasLimit: zAddress,
    paymasterPostOpGasLimit: zAddress,
    verificationGasLimit: zAddress,
    paymaster: zAddress,
    paymasterData: zAddress,
    maxPriorityFeePerGas: zAddress.optional(),
    maxFeePerGas: zAddress.optional(),
})

const zSuccessSchema: z.ZodType<PaymasterProxyResponse> = z.object({
    data: z.union([zPaymaster06Response, zPaymaster07Response]),
})

const zErrorSchema: z.ZodType<{ errorDetail: { code: PaymasterErrorCode } }> = z.object({
    errorDetail: z.object({
        code: z.nativeEnum(PaymasterErrorCode),
    }),
})

export type PaymasterRequest = RpcUserOperationRequest & {
    rootKeyAddress: string
    functionHash: string
    townId: string | undefined
    gasOverrides: GasOverrides
}

type Multiplier = number

export type GasOverrides = {
    callGasLimit?: Hex | Multiplier
    maxFeePerGas?: Hex | Multiplier
    maxPriorityFeePerGas?: Hex | Multiplier
    preVerificationGas?: Hex | Multiplier
    verificationGasLimit?: Hex | Multiplier
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

    const pendingHash = pending.hash
    const { functionHashForPaymasterProxy, spaceId } = current

    if (
        functionHashForPaymasterProxy &&
        NON_SPONSORED_FUNCTION_HASHES.includes(functionHashForPaymasterProxy)
    ) {
        return
    }

    const value = args.userOp.callData
        ? decodeCallData({
              callData: args.userOp.callData,
              functionHash: functionHashForPaymasterProxy,
          })?.value
        : undefined

    if (value !== undefined && (value < 0n || value > 0n)) {
        return
    }

    const loginMethod = getPrivyLoginMethodFromLocalStorage()

    if (loginMethod && NON_SPONSORED_LOGIN_METHODS.includes(loginMethod)) {
        return
    }

    let maxFeePerGasOverride: bigint | undefined
    let maxPriorityFeePerGasOverride: bigint | undefined

    if (pendingHash && args.userOp.sender) {
        // get the gas values
        const result = await estimateGasFeesWithReplacement({
            sender: args.userOp.sender,
            client: args.client,
        })
        maxFeePerGasOverride = result.maxFeePerGas
        maxPriorityFeePerGasOverride = result.maxPriorityFeePerGas
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

        const rpcRequest: PaymasterRequest = {
            ...formatUserOperationRequest(op as UserOperation),
            functionHash: functionHashForPaymasterProxy,
            rootKeyAddress,
            townId: spaceId,
            gasOverrides: {
                maxFeePerGas: maxFeePerGasOverride ? toHex(maxFeePerGasOverride) : undefined,
                maxPriorityFeePerGas: maxPriorityFeePerGasOverride
                    ? toHex(maxPriorityFeePerGasOverride)
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
                data: rpcRequest,
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
        type PaymasterUseropData = {
            preVerificationGas: bigint
            verificationGasLimit: bigint
            callGasLimit: bigint
            // 06
            paymasterAndData: Hex | undefined

            // 07
            paymasterVerificationGasLimit: bigint | undefined
            paymasterPostOpGasLimit: bigint | undefined
            paymaster: Hex | undefined
            paymasterData: Hex | undefined

            // alchemy
            maxPriorityFeePerGas?: bigint
            maxFeePerGas?: bigint
        }
        const gas: PaymasterUseropData = {
            preVerificationGas: hexToBigInt(parsedData.preVerificationGas),
            verificationGasLimit: hexToBigInt(parsedData.verificationGasLimit),
            callGasLimit: hexToBigInt(parsedData.callGasLimit),
            paymasterAndData: undefined,
            paymasterData: undefined,
            paymaster: undefined,
            paymasterVerificationGasLimit: undefined,
            paymasterPostOpGasLimit: undefined,
        }

        //////////////////////////////////////////////////////////////////
        // Add 06 fields
        //////////////////////////////////////////////////////////////////
        if ('paymasterAndData' in parsedData) {
            gas.paymasterAndData = parsedData.paymasterAndData
        }

        //////////////////////////////////////////////////////////////////
        // Add 07 fields
        //////////////////////////////////////////////////////////////////
        if ('paymaster' in parsedData) {
            gas.paymaster = parsedData.paymaster
        }
        if ('paymasterData' in parsedData) {
            gas.paymasterData = parsedData.paymasterData
        }

        if ('paymasterVerificationGasLimit' in parsedData) {
            gas.paymasterVerificationGasLimit = hexToBigInt(
                parsedData.paymasterVerificationGasLimit,
            )
        }
        if ('paymasterPostOpGasLimit' in parsedData) {
            gas.paymasterPostOpGasLimit = hexToBigInt(parsedData.paymasterPostOpGasLimit)
        }

        //////////////////////////////////////////////////////////////////
        // Add alchemy fields
        //////////////////////////////////////////////////////////////////
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
