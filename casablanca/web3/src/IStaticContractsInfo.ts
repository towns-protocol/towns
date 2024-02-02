import BaseSepoliaTownFactoryAddress from '@towns/generated/base_sepolia/addresses/townFactory.json' assert { type: 'json' }
import BaseSepoliaTownOwnerAddress from '@towns/generated/base_sepolia/addresses/townOwner.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAddress from '@towns/generated/base_sepolia/addresses/walletLink.json' assert { type: 'json' }

import { Address } from './ContractTypes'
export interface IStaticContractsInfo {
    townFactoryAddress: Address
    townOwnerAddress: Address
    mockErc721aAddress: Address
    testGatingTokenAddress?: Address // For tesing token gating scenarios
    walletLinkAddress: Address
}

const invalidAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const extractAddress = (m: any): Address => {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    if (m.address !== undefined) {
        return m.address as Address
    }
    if (m.default !== undefined && m.default.address !== undefined) {
        return m.default.address as Address
    }
    throw new Error('Failed to extract address from module: ' + m)
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}

const loadLocalhostContractsInfo = async (): Promise<IStaticContractsInfo> => {
    try {
        const ret: IStaticContractsInfo = {
            townFactoryAddress: extractAddress(
                await import('@towns/generated/localhost/addresses/townFactory.json'),
            ),
            townOwnerAddress: extractAddress(
                await import('@towns/generated/localhost/addresses/townOwner.json'),
            ),
            mockErc721aAddress: extractAddress(
                await import('@towns/generated/localhost/addresses/mockNFT.json'),
            ),
            testGatingTokenAddress: extractAddress(
                await import('@towns/generated/localhost/addresses/member.json'),
            ),
            walletLinkAddress: extractAddress(
                await import('@towns/generated/localhost/addresses/walletLink.json'),
            ),
        }
        console.log('Loaded localhost contracts info:', ret)
        return ret
    } catch (e) {
        console.error(e)
        return {
            townFactoryAddress: invalidAddress,
            townOwnerAddress: invalidAddress,
            mockErc721aAddress: invalidAddress,
            testGatingTokenAddress: invalidAddress,
            walletLinkAddress: invalidAddress,
        }
    }
}

const localhostContractsInfo = await loadLocalhostContractsInfo()

const baseSepoliaContractsInfo: IStaticContractsInfo = {
    townFactoryAddress: BaseSepoliaTownFactoryAddress.address as Address,
    townOwnerAddress: BaseSepoliaTownOwnerAddress.address as Address,
    mockErc721aAddress: '' as Address,
    walletLinkAddress: BaseSepoliaWalletLinkAddress.address as Address,
}

/// get contract info for a given chain id
export function getContractsInfo(chainId: number): IStaticContractsInfo {
    switch (chainId) {
        case 0:
        case 31337:
            if (localhostContractsInfo.townFactoryAddress === invalidAddress) {
                throw new Error(
                    'Failed to load localhost contract address. Deploy contracts first.',
                )
            }
            return localhostContractsInfo
        case 84532:
            return baseSepoliaContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}
