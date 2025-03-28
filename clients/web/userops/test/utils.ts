import { TestUserOps } from './TestUserOps'
import { ethers } from 'ethers'
import {
    Address,
    CheckOperationType,
    CreateLegacySpaceParams,
    CreateSpaceParams,
    MembershipStruct,
    LegacyMembershipStruct,
    LocalhostWeb3Provider,
    EncodedNoopRuleData,
    Permission,
    SpaceDapp,
    createOperationsTree,
    getFixedPricingModule,
    getWeb3Deployment,
    NoopRuleData,
    convertRuleDataV2ToV1,
    encodeRuleDataV2,
    IRuleEntitlementV2Base,
    UpdateRoleParams,
    LegacyUpdateRoleParams,
    Space,
    TIERED_PRICING_ORACLE_V2,
    TIERED_PRICING_ORACLE_V3,
} from '@towns-protocol/web3'
import { userOpsStore } from '../src/store/userOpsStore'
import { SendUserOperationReturnType } from '../src/lib/types'
import * as encodeUpdateRoleDataHelpers from '../src/utils/encodeUpdateRoleData'
import {
    formatUserOperationRequest,
    UserOperation,
    PrepareUserOperationParameters,
    prepareUserOperation,
    SendUserOperationParameters,
} from 'viem/account-abstraction'
import { getAction, parseAccount } from 'viem/utils'
import { AccountNotFoundError, SmartAccountClient } from 'permissionless'
import { getAbstractAccountAddress } from '../src/utils/getAbstractAccountAddress'
import { SmartAccountType } from '../src/types'

export const fundWallet = async (address: string, provider: LocalhostWeb3Provider) => {
    const wallet = new ethers.Wallet(
        // the private key of the account funded during startup of 4337
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        provider,
    )

    const tx = {
        from: wallet.address,
        to: address,
        value: ethers.utils.parseEther('1'),
        gasLimit: 1000000,
        chainId: (await provider.getNetwork()).chainId,
    }
    const result = await wallet.sendTransaction(tx)
    const receipt = await result.wait()
    return receipt
}
export const BORED_APE_ADDRESS = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'
export const boredApeRuleData = createOperationsTree([
    {
        address: BORED_APE_ADDRESS,
        chainId: BigInt(1),
        type: CheckOperationType.ERC721,
    },
])

function getSpaceAndChannelName(signerAddress: string) {
    return {
        spaceName: `USEROPS_TESTS__TOWN__${signerAddress}__${new Date().getTime()}`,
        channelName: `USEROPS_TESTS__CHANNEL__${signerAddress}__${new Date().getTime()}`,
    }
}

export async function createUngatedSpace({
    userOps,
    spaceDapp,
    signer,
    rolePermissions,
    spaceName,
    legacy = false,
    membershipPrice,
    freeAllocation = 100,
}: {
    userOps: TestUserOps
    spaceDapp: SpaceDapp
    signer: ethers.Signer
    rolePermissions: Permission[]
    spaceName?: string
    legacy?: boolean
    membershipPrice?: bigint
    freeAllocation?: number
}): Promise<SendUserOperationReturnType> {
    const signerAddress = await signer.getAddress()
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName
    const fixedPricingModule = await getFixedPricingModule(spaceDapp)

    if (legacy || userOps.createLegacySpaces()) {
        console.log('OPS creating legacy space')
        const downgradedMembershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: membershipPrice ?? 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: freeAllocation,
                pricingModule: fixedPricingModule.module,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                syncEntitlements: false,
            },
        }
        return userOps.sendCreateLegacySpaceOp([
            {
                spaceName: name,
                uri: name,
                channelName,
                membership: downgradedMembershipInfo,
            } satisfies CreateLegacySpaceParams,
            signer,
        ])
    } else {
        console.log('OPS creating v2 space')
        const membershipInfo: MembershipStruct = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: membershipPrice ?? 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: freeAllocation,
                pricingModule: fixedPricingModule.module,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: EncodedNoopRuleData,
                syncEntitlements: false,
            },
        }
        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateSpaceParams
        return userOps.sendCreateSpaceOp([townInfo, signer])
    }
}

export async function createGatedSpace({
    userOps,
    spaceDapp,
    signer,
    rolePermissions,
    spaceName,
}: {
    userOps: TestUserOps
    spaceDapp: SpaceDapp
    signer: ethers.Signer
    rolePermissions: Permission[]
    spaceName?: string
}): Promise<SendUserOperationReturnType> {
    const signerAddress = await signer.getAddress()
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName

    const fixedPricingModule = await getFixedPricingModule(spaceDapp)

    if (userOps.createLegacySpaces()) {
        console.log('OPS creating legacy space')
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Gated Space',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 100,
                pricingModule: fixedPricingModule.module,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: false,
                users: [],
                ruleData: convertRuleDataV2ToV1(boredApeRuleData),
                syncEntitlements: false,
            },
        }

        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateLegacySpaceParams

        return userOps.sendCreateLegacySpaceOp([townInfo, signer])
    } else {
        console.log('OPS creating v2 space')
        const membershipInfo: MembershipStruct = {
            settings: {
                name: 'Gated Space',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 100,
                pricingModule: fixedPricingModule.module,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: false,
                users: [],
                ruleData: encodeRuleDataV2(boredApeRuleData),
                syncEntitlements: false,
            },
        }

        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateSpaceParams
        return userOps.sendCreateSpaceOp([townInfo, signer])
    }
}

export async function createFixedPriceSpace({
    userOps,
    spaceDapp,
    signer,
    rolePermissions,
    spaceName,
    price,
}: {
    userOps: TestUserOps
    spaceDapp: SpaceDapp
    signer: ethers.Signer
    rolePermissions: Permission[]
    spaceName?: string
    price?: string
}): Promise<SendUserOperationReturnType> {
    const signerAddress = await signer.getAddress()
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName

    const fixedPricingModule = await getFixedPricingModule(spaceDapp)

    if (userOps.createLegacySpaces()) {
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Gated Space',
                symbol: 'MEMBER',
                price: ethers.utils.parseEther(price ?? '0.5'),
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0,
                pricingModule: fixedPricingModule.module,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                syncEntitlements: false,
            },
        }

        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateLegacySpaceParams

        return userOps.sendCreateLegacySpaceOp([townInfo, signer])
    } else {
        const membershipInfo: MembershipStruct = {
            settings: {
                name: 'Gated Space',
                symbol: 'MEMBER',
                price: ethers.utils.parseEther(price ?? '0.5'),
                maxSupply: 100,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0,
                pricingModule: fixedPricingModule.module,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: EncodedNoopRuleData,
                syncEntitlements: false,
            },
        }

        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateSpaceParams

        return userOps.sendCreateSpaceOp([townInfo, signer])
    }
}

export async function createDynamicPricingSpace({
    userOps,
    spaceDapp,
    signer,
    rolePermissions,
    spaceName,
    version,
}: {
    userOps: TestUserOps
    spaceDapp: SpaceDapp
    signer: ethers.Signer
    rolePermissions: Permission[]
    spaceName?: string
    version: 'v2' | 'v3'
}): Promise<SendUserOperationReturnType> {
    const signerAddress = await signer.getAddress()
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName
    const pricingModules = await spaceDapp.listPricingModules()
    let pricingModule: string | undefined
    // we don't deploy TieredLogPricingOracle locally, it starts with TieredLogPricingOracleV2
    if (version === 'v2') {
        pricingModule = await pricingModules.find(
            (module) => module.name === TIERED_PRICING_ORACLE_V2,
        )?.module
    } else if (version === 'v3') {
        pricingModule = await pricingModules.find(
            (module) => module.name === TIERED_PRICING_ORACLE_V3,
        )?.module
    }

    if (!pricingModule) {
        throw new Error('Pricing module not found')
    }

    if (userOps.createLegacySpaces()) {
        const membershipInfo: LegacyMembershipStruct = {
            settings: {
                name: 'Dynamic Pricing Space',
                symbol: 'MEMBER',
                price: 0n,
                maxSupply: 200,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0, // this will effect the price
                pricingModule,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
                syncEntitlements: false,
            },
        }

        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateLegacySpaceParams

        return userOps.sendCreateLegacySpaceOp([townInfo, signer])
    } else {
        const membershipInfo: MembershipStruct = {
            settings: {
                name: 'Dynamic Pricing Space',
                symbol: 'MEMBER',
                price: 0n,
                maxSupply: 200,
                duration: 0,
                currency: ethers.constants.AddressZero,
                feeRecipient: ethers.constants.AddressZero,
                freeAllocation: 0, // this will effect the price
                pricingModule: pricingModule,
            },
            permissions: rolePermissions,
            requirements: {
                everyone: true,
                users: [],
                ruleData: EncodedNoopRuleData,
                syncEntitlements: false,
            },
        }

        const townInfo = {
            spaceName: name,
            uri: name,
            channelName,
            membership: membershipInfo,
        } satisfies CreateSpaceParams

        return userOps.sendCreateSpaceOp([townInfo, signer])
    }
}

export function generatePrivyWalletIfKey(privateKey?: string) {
    if (privateKey) {
        return new ethers.Wallet(privateKey)
    }
}

export const createSpaceDappAndUserops = async (
    provider: LocalhostWeb3Provider,
    newAccountImplementationType?: SmartAccountType,
) => {
    const baseConfig = getWeb3Deployment(process.env.RIVER_ENV as string).base // see util.test.ts for loading from env
    const spaceDapp = new SpaceDapp(baseConfig, provider)

    const _newAccountImplementationType =
        newAccountImplementationType ?? process.env.AA_NEW_ACCOUNT_IMPLEMENTATION_TYPE

    if (_newAccountImplementationType !== 'simple' && _newAccountImplementationType !== 'modular') {
        throw new Error('Invalid new account implementation type')
    }

    const userOpsInstance = new TestUserOps({
        provider: spaceDapp.provider,
        config: spaceDapp.config,
        spaceDapp,
        bundlerUrl: process.env.AA_BUNDLER_URL,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL,
        aaRpcUrl: process.env.AA_RPC_URL!,
        entryPointAddress: process.env.AA_ENTRY_POINT_ADDRESS,
        factoryAddress: process.env.AA_FACTORY_ADDRESS,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET!,
        fetchAccessTokenFn: undefined,
        newAccountImplementationType: _newAccountImplementationType,
    })

    const aaAddress = await getAbstractAccountAddress({
        rootKeyAddress: (await provider.wallet.getAddress()) as Address,
        aaRpcUrl: process.env.AA_RPC_URL!,
        newAccountImplementationType: _newAccountImplementationType,
    })

    if (!aaAddress) {
        throw new Error('Failed to get abstract account address')
    }

    // test users always confirm
    userOpsStore.subscribe((state) => {
        if (state.userOps[aaAddress]?.promptUser) {
            userOpsStore.getState().setPromptResponse(aaAddress, 'confirm')
        }
    })

    return {
        spaceDapp,
        aaAddress,
        userOps: userOpsInstance,
    }
}

export const waitForOpAndTx = async (
    op: SendUserOperationReturnType,
    provider: ethers.providers.StaticJsonRpcProvider,
    action?: string,
) => {
    console.log('debug:op', op, action)
    const receipt = await op.wait()
    expect(receipt?.transactionHash).toBeDefined()
    const txReceipt = await provider.waitForTransaction(receipt!.transactionHash)
    expect(txReceipt?.status).toBe(1)
    return txReceipt
}

export async function getSpaceId(
    spaceDapp: SpaceDapp,
    receipt: ethers.providers.TransactionReceipt,
    rootKeyAddress: string,
    userOps: TestUserOps,
) {
    const sender = await userOps.getAbstractAccountAddress({
        rootKeyAddress: rootKeyAddress as Address,
    })
    expect(sender).toBeDefined()
    const spaceAddress = spaceDapp.getSpaceAddress(receipt, sender!)
    expect(spaceAddress).toBeDefined()
    const spaceId = '10' + spaceAddress!.slice(2) + '0'.repeat(64 - spaceAddress!.length)
    expect(spaceId).toBeDefined()
    return spaceId
}

export async function isSmartAccountDeployed(signer: ethers.Signer, userOps: TestUserOps) {
    const abstractAccountAddress = await userOps.getAbstractAccountAddress({
        rootKeyAddress: (await signer.getAddress()) as Address,
    })

    if (abstractAccountAddress) {
        const isDeployed = await signer.provider?.getCode(abstractAccountAddress)
        if (!isDeployed || isDeployed === '0x') {
            return false
        }
        return true
    }
}

/**
 * Debugging tests
 * Sometimes I'm getting AA25 invalid account nonce
 * I suspect this is b/c multiple userops for the same account are being sent too quickly and sitting in the mempool
 * But I don't want to introduce 2D nonces atm https://docs.stackup.sh/docs/useroperation-nonce
 * So this is a hack to slow down the time between userops
 * @param sleepTime
 */
export async function sleepBetweenTxs(sleepTime = 100) {
    return new Promise((resolve) => setTimeout(resolve, sleepTime))
}

export async function sendCreateRoleOp(
    userOps: TestUserOps,
    spaceId: string,
    roleName: string,
    rolePermissions: Permission[],
    users: string[],
    ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
    signer: ethers.Signer,
) {
    if (userOps.createLegacySpaces()) {
        return userOps.sendLegacyCreateRoleOp([
            spaceId,
            roleName,
            rolePermissions,
            users,
            convertRuleDataV2ToV1(ruleData),
            signer,
        ])
    } else {
        return userOps.sendCreateRoleOp([
            spaceId,
            roleName,
            rolePermissions,
            users,
            ruleData,
            signer,
        ])
    }
}

export async function sendUpdateRoleOp(
    userOps: TestUserOps,
    params: UpdateRoleParams,
    signer: ethers.Signer,
) {
    if (userOps.createLegacySpaces()) {
        const legacyParams = {
            ...params,
            ruleData: convertRuleDataV2ToV1(params.ruleData),
        } as LegacyUpdateRoleParams
        return userOps.sendLegacyUpdateRoleOp([legacyParams, signer])
    } else {
        return userOps.sendUpdateRoleOp([params, signer])
    }
}

export async function sendEditMembershipSettingsOp(
    userOps: TestUserOps,
    spaceId: string,
    updateRoleParams: UpdateRoleParams,
    membershipParams: {
        pricingModule: string
        membershipPrice: ethers.BigNumberish // wei
        membershipSupply: ethers.BigNumberish
        freeAllocation?: ethers.BigNumberish
    },
    signer: ethers.Signer,
) {
    if (userOps.createLegacySpaces()) {
        const legacyUpdateRoleParams = {
            ...updateRoleParams,
            ruleData: convertRuleDataV2ToV1(updateRoleParams.ruleData),
        } as LegacyUpdateRoleParams
        return userOps.sendLegacyEditMembershipSettingsOp({
            spaceId,
            legacyUpdateRoleParams,
            membershipParams,
            signer,
        })
    } else {
        return userOps.sendEditMembershipSettingsOp({
            spaceId,
            updateRoleParams,
            membershipParams,
            signer,
        })
    }
}

export async function encodeUpdateRoleData(
    userOps: TestUserOps,
    space: Space,
    spaceDapp: SpaceDapp,
    updateRoleParams: UpdateRoleParams,
) {
    if (userOps.createLegacySpaces()) {
        const legacyUpdateRoleParams = {
            ...updateRoleParams,
            ruleData: convertRuleDataV2ToV1(updateRoleParams.ruleData),
        } as LegacyUpdateRoleParams
        return encodeUpdateRoleDataHelpers.encodeLegacyUpdateRoleData({
            space,
            legacyUpdateRoleParams,
        })
    } else {
        return encodeUpdateRoleDataHelpers.encodeUpdateRoleData({
            space,
            updateRoleParams,
            spaceDapp,
        })
    }
}

// viem sendUserOperation calls prepareUserOperation internally
// need to do this so can test error handling from failed eth_sendUserOperation
export async function mockViemSendUserOperation(
    client: SmartAccountClient,
    parameters: SendUserOperationParameters,
) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { account: account_ = client.account, entryPointAddress } = parameters

    if (!account_ && !parameters.sender) throw new AccountNotFoundError()
    const account = account_ ? parseAccount(account_) : undefined

    const request = account
        ? await getAction(
              client,
              prepareUserOperation,
              'prepareUserOperation',
          )(parameters as unknown as PrepareUserOperationParameters)
        : parameters

    const signature = (parameters.signature ||
        (await account?.signUserOperation(request as UserOperation)))!

    const rpcParameters = formatUserOperationRequest({
        ...request,
        signature,
    } as UserOperation)

    return { rpcParameters, signature, request }
    // the rest of the viem function we don't need
    // try {
    //     return await client.request(
    //       {
    //         method: 'eth_sendUserOperation',
    //         params: [
    //           rpcParameters,
    //           (entryPointAddress ?? account?.entryPoint.address)!,
    //         ],
    //       },
    //       { retryCount: 0 },
    //     )
    //   } catch (error) {
    //     const calls = (parameters as any).calls
    //     throw getUserOperationError(error as BaseError, {
    //       ...(request as UserOperation),
    //       ...(calls ? { calls } : {}),
    //       signature,
    //     })
    //   }
}
