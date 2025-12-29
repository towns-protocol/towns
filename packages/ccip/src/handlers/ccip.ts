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

    const decodedStuffedResolveCall = decodeFunctionData({
        abi: il1ResolverServiceAbi,
        data,
    })

    const [dnsEncodedName, encodedResolveCall, targetChainId, targetRegistryAddress] =
        decodedStuffedResolveCall.args

    const result = await handleQuery({
        dnsEncodedName,
        encodedResolveCall,
        targetChainId,
        targetRegistryAddress,
        env,
    })

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
