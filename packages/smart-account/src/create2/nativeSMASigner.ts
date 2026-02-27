import {
    hashMessage,
    hashTypedData,
    type Hex,
    type SignableMessage,
    type TypedData,
    type TypedDataDefinition,
    type Address,
    type LocalAccount,
    concat,
    toHex,
} from 'viem'

/**
 * Default entity ID for the native owner validation
 */
export const DEFAULT_OWNER_ENTITY_ID = 0

/**
 * Packs the user operation signature for modular accounts
 * Format: 0xFF + 0x00 (EOA type) + validationSignature
 */
export function packUOSignature(validationSignature: Hex): Hex {
    return concat(['0xFF', '0x00', validationSignature])
}

/**
 * Packs the 1271 signature for modular accounts
 * Format: 0x00 + entityId (4 bytes) + 0xFF + 0x00 (EOA type) + validationSignature
 */
export function pack1271Signature(validationSignature: Hex, entityId: number): Hex {
    return concat([
        '0x00',
        toHex(entityId, { size: 4 }),
        '0xFF',
        '0x00', // EOA type signature
        validationSignature,
    ])
}

// 👋 Taken from aa-sdk
// 👋 see aa-sdk for more details account-kit/smart-contracts/src/ma-v2/account/nativeSMASigner.ts
/**
 * Creates an object with methods for generating a dummy signature, signing user operation hashes, signing messages, and signing typed data.
 *
 * @example
 * ```ts
 * import { nativeSMASigner } from "@account-kit/smart-contracts";
 
 * import { LocalAccountSigner } from "@aa-sdk/core";
 *
 * const MNEMONIC = "...":
 *
 * const account = createModularAccountV2({ config });
 *
 * const signer = LocalAccountSigner.mnemonicToAccountSigner(MNEMONIC);
 *
 * const messageSigner = nativeSMASigner(signer, chain, account.address);
 * ```
 *
 * @param {LocalAccount} signer Signer to use for signing operations
 * @param {Chain} chain Chain object for the signer
 * @param {Address} accountAddress address of the smart account using this signer
 * @returns {object} an object with methods for signing operations and managing signatures
 */
export function nativeSMASigner(signer: LocalAccount, chainId: number, accountAddress: Address) {
    return {
        /**
         * Returns a dummy signature for gas estimation
         */
        getDummySignature(): Hex {
            const dummyEcdsaSignature =
                '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'
            return packUOSignature(dummyEcdsaSignature)
        },

        /**
         * Signs a user operation hash with proper wrapping
         */
        async signUserOperationHash(uoHash: Hex): Promise<Hex> {
            const signature = await signer.signMessage({
                message: { raw: uoHash },
            })
            return packUOSignature(signature)
        },

        /**
         * Signs a message with 1271 signature wrapping
         * Uses ReplaySafeHash typed data for replay protection
         */
        async signMessage({ message }: { message: SignableMessage }): Promise<Hex> {
            const hash = hashMessage(message)
            const validationSignature = await signer.signTypedData({
                domain: {
                    chainId,
                    verifyingContract: accountAddress,
                },
                types: {
                    ReplaySafeHash: [{ name: 'hash', type: 'bytes32' }],
                },
                message: {
                    hash,
                },
                primaryType: 'ReplaySafeHash',
            })
            return pack1271Signature(validationSignature, DEFAULT_OWNER_ENTITY_ID)
        },

        /**
         * Signs typed data with appropriate wrapping
         * Handles deferred actions specially (no 1271 wrapping)
         */
        async signTypedData<
            const typedData extends TypedData | Record<string, unknown>,
            primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
        >(typedDataDefinition: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
            // Deferred actions already have replay protection via the account domain
            const isDeferredAction =
                typedDataDefinition?.primaryType === 'DeferredAction' &&
                // @ts-expect-error domain may not exist on all typed data
                typedDataDefinition?.domain?.verifyingContract === accountAddress

            if (isDeferredAction) {
                return signer.signTypedData(typedDataDefinition)
            }

            // Apply 1271 wrapping for other typed data
            const validationSignature = await signer.signTypedData({
                domain: {
                    chainId,
                    verifyingContract: accountAddress,
                },
                types: {
                    ReplaySafeHash: [{ name: 'hash', type: 'bytes32' }],
                },
                message: {
                    hash: hashTypedData(typedDataDefinition),
                },
                primaryType: 'ReplaySafeHash',
            })
            return pack1271Signature(validationSignature, DEFAULT_OWNER_ENTITY_ID)
        },
    }
}
