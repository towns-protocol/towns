import { MembershipStruct, Permission, Address } from '../src/types'
import { EncodedNoopRuleData } from '../src/space'
import {
    BaseChainConfig,
    ETH_ADDRESS,
    getDynamicPricingModule,
    getFixedPricingModule,
} from '../src/utils'
import { SpaceDapp } from '../src/space-dapp'
import { ethers } from 'ethers'
import { MockERC721AShim } from './MockERC721AShim'
import { getTestGatingNFTContractAddress } from './TestGatingNFT'

export async function makeDefaultMembershipInfo(
    spaceDapp: SpaceDapp,
    feeRecipient: string,
    pricing: 'dynamic' | 'fixed' = 'dynamic',
    price = 0n,
    freeAllocation = 1000,
) {
    const pricingModule =
        pricing == 'dynamic'
            ? await getDynamicPricingModule(spaceDapp)
            : await getFixedPricingModule(spaceDapp)
    return {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: feeRecipient,
            freeAllocation,
            pricingModule: pricingModule.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: true,
            users: [],
            syncEntitlements: false,
            ruleData: EncodedNoopRuleData,
        },
    } satisfies MembershipStruct
}

export function mintMockNFT(
    provider: ethers.providers.Provider,
    config: BaseChainConfig,
    fromWallet: ethers.Wallet,
    toAddress: string,
): Promise<ethers.ContractTransaction> {
    if (!config.addresses.utils.mockNFT) {
        throw new Error('No mock ERC721 address provided')
    }
    const mockNFTAddress = config.addresses.utils.mockNFT
    const mockNFT = new MockERC721AShim(mockNFTAddress, provider)
    return mockNFT.write(fromWallet).mintTo(toAddress)
}

export function balanceOfMockNFT(
    config: BaseChainConfig,
    provider: ethers.providers.Provider,
    address: Address,
) {
    if (!config.addresses.utils.mockNFT) {
        throw new Error('No mock ERC721 address provided')
    }
    const mockNFTAddress = config.addresses.utils.mockNFT
    const mockNFT = new MockERC721AShim(mockNFTAddress, provider)
    return mockNFT.read.balanceOf(address)
}

export async function getTestGatingNftAddress(_chainId: number): Promise<Address> {
    return await getTestGatingNFTContractAddress()
}
