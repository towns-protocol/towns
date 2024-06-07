import { ISpaceDapp } from 'use-towns-client/src/types/web3-types'
import { TestUserOps } from './TestUserOps'
import { ethers } from 'ethers'
import {
    Address,
    CheckOperationType,
    CreateSpaceParams,
    IArchitectBase,
    NoopRuleData,
    Permission,
    SpaceDapp,
    createOperationsTree,
    getDynamicPricingModule,
    getFixedPricingModule,
    getWeb3Deployment,
} from '@river-build/web3'
import { ISendUserOperationResponse } from 'userop'

export const BORED_APE_ADDRESS = '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'
export const boredApeRuleData = createOperationsTree([
    {
        address: BORED_APE_ADDRESS,
        chainId: BigInt(1),
        type: CheckOperationType.ERC721,
    },
])

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
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET!,
        skipPromptUserOnPMRejectedOp: true,
    })
}

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
}: {
    userOps: TestUserOps
    spaceDapp: ISpaceDapp
    signer: ethers.Signer
    rolePermissions: Permission[]
    spaceName?: string
}): Promise<ISendUserOperationResponse> {
    const signerAddress = await signer.getAddress()
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName
    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)

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

export async function createGatedSpace({
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
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName

    const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)

    const membershipInfo: IArchitectBase.MembershipStruct = {
        settings: {
            name: 'Gated Space',
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
            everyone: false,
            users: [],
            ruleData: boredApeRuleData,
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

export async function createFixedPriceSpace({
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
    const { spaceName: generatedSpaceName, channelName: channelName } =
        getSpaceAndChannelName(signerAddress)
    const name = spaceName ?? generatedSpaceName

    const fixedPricingModule = await getFixedPricingModule(spaceDapp)

    const membershipInfo: IArchitectBase.MembershipStruct = {
        settings: {
            name: 'Gated Space',
            symbol: 'MEMBER',
            price: ethers.utils.parseEther('0.5'),
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: signerAddress,
            freeAllocation: 1, // needs to be > 0
            pricingModule: fixedPricingModule.module,
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
    action?: string,
) => {
    console.log('debug:op', op, action)
    const receipt = await op.wait()
    expect(receipt?.transactionHash).toBeDefined()
    const txReceipt = await provider.waitForTransaction(receipt!.transactionHash)
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
