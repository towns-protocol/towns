import { ISpaceDapp } from 'use-towns-client/src/types/web3-types'
import { TestUserOps } from './TestUserOps'
import { paymasterProxyMiddleware } from '../src/paymasterProxyMiddleware'
import { ethers } from 'ethers'
import {
    Address,
    CreateSpaceParams,
    IArchitectBase,
    NoopRuleData,
    Permission,
    PricingModuleStruct,
    SpaceDapp,
    getWeb3Deployment,
} from '@river-build/web3'
import { ISendUserOperationResponse } from 'userop'

export const UserOps = ({ spaceDapp }: { spaceDapp: ISpaceDapp }) => {
    return new TestUserOps({
        provider: spaceDapp.provider,
        config: spaceDapp.config,
        spaceDapp,
        bundlerUrl: process.env.AA_BUNDLER_URL,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL,
        aaRpcUrl: process.env.AA_RPC_URL!,
        entryPointAddress: process.env.AA_ENTRY_POINT_ADDRESS,
        factoryAddress: process.env.AA_FACTORY_ADDRESS,
        paymasterMiddleware: paymasterProxyMiddleware({
            paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET!,
        }),
    })
}

export async function createUngatedSpace({
    userOps,
    spaceDapp,
    signer,
    rolePermissions,
    spaceName,
}: {
    userOps: TestUserOps
    spaceDapp: ISpaceDapp
    signer: ethers.Signer
    rolePermissions: Permission[]
    spaceName?: string
}): Promise<ISendUserOperationResponse> {
    const signerAddress = await signer.getAddress()
    const name = spaceName ?? `USEROPS_TESTS__TOWN__${signerAddress}__${new Date().getTime()}`
    const channelName = `USEROPS_TESTS__CHANNEL__${signerAddress}__${new Date().getTime()}`

    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)

    // Everyone role
    const membershipInfo: IArchitectBase.MembershipStruct = {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: signerAddress,
            freeAllocation: 0,
            pricingModule: dynamicPricingModule.module,
        },
        permissions: rolePermissions,
        requirements: {
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        },
    }

    const townInfo = {
        spaceName: name,
        spaceMetadata: name,
        channelName,
        membership: membershipInfo,
    } satisfies CreateSpaceParams

    return userOps.sendCreateSpaceOp([townInfo, signer])
}

export const getDynamicPricingModule = async (spaceDapp: ISpaceDapp | undefined) => {
    if (!spaceDapp) {
        throw new Error('getDynamicPricingModule: No spaceDapp')
    }
    const pricingModules = await spaceDapp.listPricingModules()
    const dynamicPricingModule = findDynamicPricingModule(pricingModules)
    if (!dynamicPricingModule) {
        throw new Error('getDynamicPricingModule: no dynamicPricingModule')
    }
    return dynamicPricingModule
}

export const getFixedPricingModule = async (spaceDapp: ISpaceDapp | undefined) => {
    if (!spaceDapp) {
        throw new Error('getFixedPricingModule: No spaceDapp')
    }
    const pricingModules = await spaceDapp.listPricingModules()
    const fixedPricingModule = findFixedPricingModule(pricingModules)
    if (!fixedPricingModule) {
        throw new Error('getFixedPricingModule: no fixedPricingModule')
    }
    return fixedPricingModule
}

export const TIERED_PRICING_ORACLE = 'TieredLogPricingOracle'
export const FIXED_PRICING = 'FixedPricing'

export const findDynamicPricingModule = (pricingModules: PricingModuleStruct[]) =>
    pricingModules.find((module) => module.name === TIERED_PRICING_ORACLE)

export const findFixedPricingModule = (pricingModules: PricingModuleStruct[]) =>
    pricingModules.find((module) => module.name === FIXED_PRICING)

export function generatePrivyWalletIfKey(privateKey?: string) {
    if (privateKey) {
        return new ethers.Wallet(privateKey)
    }
}

export const createSpaceDappAndUserops = (provider: ethers.providers.StaticJsonRpcProvider) => {
    const baseConfig = getWeb3Deployment(process.env.RIVER_ENV as string).base // see util.test.ts for loading from env
    const spaceDapp = new SpaceDapp(baseConfig, provider)
    return {
        spaceDapp,
        userOps: UserOps({ spaceDapp }),
    }
}

export const waitForOpAndTx = async (
    op: ISendUserOperationResponse,
    provider: ethers.providers.StaticJsonRpcProvider,
) => {
    const createSpaceOpReceipt = await op.wait()
    const txReceipt = await provider.waitForTransaction(createSpaceOpReceipt!.transactionHash)
    expect(txReceipt?.status).toBe(1)
    return txReceipt
}

export function getSpaceId(spaceDapp: ISpaceDapp, receipt: ethers.providers.TransactionReceipt) {
    const spaceAddress = spaceDapp.getSpaceAddress(receipt)
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
export async function sleepBetweenTxs(sleepTime = 5_000) {
    return new Promise((resolve) => setTimeout(resolve, sleepTime))
}
