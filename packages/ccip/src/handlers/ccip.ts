import type { HonoRequest } from 'hono'
import { type Address, type Hex, serializeSignature } from 'viem'
import { sign } from 'viem/accounts'
import {
    decodeFunctionData,
    encodeAbiParameters,
    encodePacked,
    isAddress,
    isHex,
    keccak256,
} from 'viem/utils'
import { z } from 'zod'

import { type Env, envVar } from '../env'
import { handleQuery } from '../ccip-read/query'
import { il1ResolverServiceAbi } from '../abi'

const schema = z.object({
    sender: z
        .string()
        .refine(isAddress, { message: 'Invalid address' })
        .transform((v) => v as Address),
    data: z
        .string()
        .refine(isHex, { message: 'Invalid hex data' })
        .transform((v) => v as Hex),
})

// Implements ERC-3668
export const getCcipRead = async (req: HonoRequest, env: Env): Promise<Response> => {
    const safeParse = schema.safeParse(req.param())

    if (!safeParse.success) {
        return Response.json(
            { message: 'Invalid request', error: safeParse.error },
            { status: 400 },
        )
    }

    const { sender, data } = safeParse.data

    // Decode the stuffed resolve call with error handling for malformed input
    let dnsEncodedName: Hex
    let encodedResolveCall: Hex
    let targetChainId: bigint
    let targetRegistryAddress: Hex

    try {
        const decodedStuffedResolveCall = decodeFunctionData({
            abi: il1ResolverServiceAbi,
            data,
        })

        // Validate that args exist and have the expected structure
        if (!decodedStuffedResolveCall.args || decodedStuffedResolveCall.args.length < 4) {
            console.error('CCIP decode error: Missing or incomplete args', {
                functionName: decodedStuffedResolveCall.functionName,
                argsLength: decodedStuffedResolveCall.args?.length ?? 0,
                sender,
                data,
            })
            return Response.json(
                { message: 'Invalid request: decoded args missing or incomplete' },
                { status: 400 },
            )
        }

        const [
            rawDnsEncodedName,
            rawEncodedResolveCall,
            rawTargetChainId,
            rawTargetRegistryAddress,
        ] = decodedStuffedResolveCall.args

        // Type validation for decoded arguments
        if (
            typeof rawDnsEncodedName !== 'string' ||
            !isHex(rawDnsEncodedName) ||
            typeof rawEncodedResolveCall !== 'string' ||
            !isHex(rawEncodedResolveCall) ||
            typeof rawTargetChainId !== 'bigint' ||
            typeof rawTargetRegistryAddress !== 'string' ||
            !isHex(rawTargetRegistryAddress)
        ) {
            console.error('CCIP decode error: Invalid argument types', {
                dnsEncodedName: rawDnsEncodedName,
                encodedResolveCall: rawEncodedResolveCall,
                targetChainId: String(rawTargetChainId),
                targetRegistryAddress: rawTargetRegistryAddress,
                sender,
            })
            return Response.json(
                { message: 'Invalid request: decoded argument types are incorrect' },
                { status: 400 },
            )
        }

        dnsEncodedName = rawDnsEncodedName
        encodedResolveCall = rawEncodedResolveCall
        targetChainId = rawTargetChainId
        targetRegistryAddress = rawTargetRegistryAddress
    } catch (decodeError) {
        console.error('CCIP decode error: Failed to decode function data', {
            error: decodeError instanceof Error ? decodeError.message : String(decodeError),
            sender,
            data,
        })
        return Response.json(
            {
                message: 'Invalid request: failed to decode function data',
                error: decodeError instanceof Error ? decodeError.message : 'Unknown decode error',
            },
            { status: 400 },
        )
    }

    // Query the L2 resolver
    let result: Hex
    try {
        result = await handleQuery({
            dnsEncodedName,
            encodedResolveCall,
            targetChainId,
            targetRegistryAddress,
            env,
        })
    } catch (queryError) {
        console.error('CCIP query error: handleQuery failed', {
            error: queryError instanceof Error ? queryError.message : String(queryError),
            dnsEncodedName,
            targetChainId: String(targetChainId),
            targetRegistryAddress,
            sender,
        })
        return Response.json(
            {
                message: 'Query failed: unable to resolve from L2',
                error: queryError instanceof Error ? queryError.message : 'Unknown query error',
            },
            { status: 502 },
        )
    }

    // Validate the query result - '0x' indicates unsupported chain or empty result
    if (!result || result === '0x') {
        console.error('CCIP query error: empty or unsupported result', {
            result,
            dnsEncodedName,
            targetChainId: String(targetChainId),
            targetRegistryAddress,
            sender,
        })
        return Response.json(
            {
                message: 'Query failed: unsupported chain or empty result from resolver',
                context: {
                    targetChainId: String(targetChainId),
                    targetRegistryAddress,
                },
            },
            { status: 404 },
        )
    }

    const ttl = 1000
    const validUntil = Math.floor(Date.now() / 1000 + ttl)

    // Specific to `makeSignatureHash()` in the L1ResolverFacet contract
    const messageHash = keccak256(
        encodePacked(
            ['bytes', 'address', 'uint64', 'bytes32', 'bytes32'],
            [
                '0x1900', // This is hardcoded in the contract (EIP-191).
                sender, // target: The address the signature is for.
                BigInt(validUntil), // expires: The timestamp at which the response becomes invalid.
                keccak256(data), // request: The original request that was sent.
                keccak256(result), // result: The `result` field of the response (not including the signature part).
            ],
        ),
    )

    const sig = await sign({
        hash: messageHash,
        privateKey: envVar('SIGNER_PRIVATE_KEY', env),
    })

    // An ABI encoded tuple of `(bytes result, uint64 expires, bytes sig)`, where
    // `result` is the data to return to the caller and `sig` is the (r,s,v) encoded message signature.
    // Specific to `isValidSignatureNow()` in SignatureCheckerLib.sol
    const encodedResponse = encodeAbiParameters(
        [
            { name: 'result', type: 'bytes' },
            { name: 'expires', type: 'uint64' },
            { name: 'sig', type: 'bytes' },
        ],
        [result, BigInt(validUntil), serializeSignature(sig)],
    )

    return Response.json({ data: encodedResponse }, { status: 200 })
}
