import {
    concat,
    toHex,
    type Hex,
    type Chain,
    type Address,
    decodeFunctionData,
    concatHex,
} from 'viem'
import {
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    mainnet,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    sepolia,
} from 'viem/chains'

export const DEFAULT_OWNER_ENTITY_ID = 0

export type PackUOSignatureParams = {
    // orderedHookData: HookData[];
    validationSignature: Hex
}

// TODO: direct call validation 1271
export type Pack1271SignatureParams = {
    validationSignature: Hex
    entityId: number
}

// Signature packing utility for user operations
export const packUOSignature = ({
    // orderedHookData, TODO: integrate in next iteration of MAv2 sdk
    validationSignature,
}: PackUOSignatureParams): Hex => {
    return concat(['0xFF', '0x00', validationSignature])
}

// Signature packing utility for 1271 signatures
export const pack1271Signature = ({
    validationSignature,
    entityId,
}: Pack1271SignatureParams): Hex => {
    return concat([
        '0x00',
        toHex(entityId, { size: 4 }),
        '0xFF',
        '0x00', // EOA type signature
        validationSignature,
    ])
}

export const getDefaultMAV2FactoryAddress = (chainId: number): Address => {
    switch (chainId) {
        // TODO: case mekong.id:
        case sepolia.id:
        case baseSepolia.id:
        case polygon.id:
        case mainnet.id:
        case polygonAmoy.id:
        case optimism.id:
        case optimismSepolia.id:
        case arbitrum.id:
        case arbitrumSepolia.id:
        case base.id:
        default:
            return '0x00000000000017c61b5bEe81050EC8eFc9c6fecd'
    }
}

export const getDefaultSMAV2BytecodeAddress = (chain: Chain): Address => {
    switch (chain.id) {
        // TODO: case mekong.id:
        case sepolia.id:
        case baseSepolia.id:
        case polygon.id:
        case mainnet.id:
        case polygonAmoy.id:
        case optimism.id:
        case optimismSepolia.id:
        case arbitrum.id:
        case arbitrumSepolia.id:
        case base.id:
        default:
            return '0x000000000000c5A9089039570Dd36455b5C07383'
    }
}

export const getDefaultSMAV2StorageAddress = (chain: Chain): Address => {
    switch (chain.id) {
        // TODO: case mekong.id:
        case sepolia.id:
        case baseSepolia.id:
        case polygon.id:
        case mainnet.id:
        case polygonAmoy.id:
        case optimism.id:
        case optimismSepolia.id:
        case arbitrum.id:
        case arbitrumSepolia.id:
        case base.id:
        default:
            return '0x0000000000006E2f9d80CaEc0Da6500f005EB25A'
    }
}

export const getDefaultSMAV27702Address = (chain: Chain): Address => {
    switch (chain.id) {
        // TODO: case mekong.id:
        case sepolia.id:
        case baseSepolia.id:
        case polygon.id:
        case mainnet.id:
        case polygonAmoy.id:
        case optimism.id:
        case optimismSepolia.id:
        case arbitrum.id:
        case arbitrumSepolia.id:
        case base.id:
        default:
            return '0x69007702764179f14F51cdce752f4f775d74E139'
    }
}

export const getDefaultMAV2Address = (chain: Chain): Address => {
    switch (chain.id) {
        // TODO: case mekong.id:
        case sepolia.id:
        case baseSepolia.id:
        case polygon.id:
        case mainnet.id:
        case polygonAmoy.id:
        case optimism.id:
        case optimismSepolia.id:
        case arbitrum.id:
        case arbitrumSepolia.id:
        case base.id:
        default:
            return '0x00000000000002377B26b1EdA7b0BC371C60DD4f'
    }
}

export const executeUserOpSelector: Hex = '0x8DD7712F'

/**
 * Decodes callData by removing the executeUserOpSelector prefix if present
 * @param callData The encoded call data that might include the executeUserOpSelector
 * @returns The original callData without the executeUserOpSelector
 */
export function modularDecodeCallData(callData: Hex): Hex {
    // Check if callData starts with the executeUserOpSelector
    if (callData.startsWith(executeUserOpSelector)) {
        // Remove the selector (first 4 bytes/8 hex chars + '0x')
        return `0x${callData.slice(executeUserOpSelector.length + 2)}`
    }
    // If no selector prefix is found, return the original callData
    return callData
}

export function modularDecodeExecute(callData: Hex) {
    return decodeFunctionData({
        abi: [
            {
                type: 'function',
                name: 'execute',
                inputs: [
                    {
                        name: 'target',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'value',
                        type: 'uint256',
                        internalType: 'uint256',
                    },
                    {
                        name: 'data',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                ],
                outputs: [
                    {
                        name: 'result',
                        type: 'bytes',
                        internalType: 'bytes',
                    },
                ],
                stateMutability: 'payable',
            },
        ],
        data: modularDecodeCallData(callData),
    })
}

export function modularDecodeExecuteBatch(callData: Hex) {
    return decodeFunctionData({
        abi: [
            {
                type: 'function',
                name: 'executeBatch',
                inputs: [
                    {
                        name: 'calls',
                        type: 'tuple[]',
                        internalType: 'struct Call[]',
                        components: [
                            {
                                name: 'target',
                                type: 'address',
                                internalType: 'address',
                            },
                            {
                                name: 'value',
                                type: 'uint256',
                                internalType: 'uint256',
                            },
                            {
                                name: 'data',
                                type: 'bytes',
                                internalType: 'bytes',
                            },
                        ],
                    },
                ],
                outputs: [
                    {
                        name: 'results',
                        type: 'bytes[]',
                        internalType: 'bytes[]',
                    },
                ],
                stateMutability: 'payable',
            },
        ],
        data: modularDecodeCallData(callData),
    })
}

export type ModuleEntity = {
    moduleAddress: Address
    entityId: number
}

/**
 * Serializes a module entity into a hexadecimal format by concatenating the module address and entity ID.
 *
 * @example
 * ```ts
 * import { serializeModuleEntity } from "@account-kit/smart-contracts";
 * import { Address } from "viem";
 *
 * const moduleAddress: Address = "0x1234";
 * const entityId: number = 1234;
 *
 * const moduleEntityHex = serializeModuleEntity({
 *  moduleAddress,
 *  entityId
 * });
 * ```
 *
 * @param {ModuleEntity} config The module entity configuration containing the module address and entity ID
 * @returns {Hex} A hexadecimal string representation of the serialized module entity
 */
export function serializeModuleEntity(config: ModuleEntity): Hex {
    return concatHex([config.moduleAddress, toHex(config.entityId, { size: 4 })])
}
