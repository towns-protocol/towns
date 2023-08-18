import { IStaticContractsInfoV3 } from './IStaticContractsInfoV3'
import { ITownArchitectShim } from './ITownArchitectShim'
import { Town } from './Town'
import { ethers } from 'ethers'

interface TownRegistry {
    [townId: string]: Town
}

export class TownRegistrar {
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly townArchitect: ITownArchitectShim
    private readonly townOwnerAddress: string
    private readonly towns: TownRegistry = {}

    constructor(
        contractsInfo: IStaticContractsInfoV3,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.chainId = chainId
        this.provider = provider
        this.townOwnerAddress = contractsInfo.townOwnerAddress
        this.townArchitect = new ITownArchitectShim(
            contractsInfo.townFactoryAddress,
            chainId,
            provider,
        )
    }

    public get TownArchitect(): ITownArchitectShim {
        return this.townArchitect
    }

    public async getTown(spaceId: string): Promise<Town | undefined> {
        if (this.towns[spaceId] === undefined) {
            const townAddress = await this.townArchitect.read.getTownById(spaceId)
            if (!townAddress || townAddress === ethers.constants.AddressZero) {
                return undefined // town is not found
            }
            this.towns[spaceId] = new Town({
                address: townAddress,
                spaceId: spaceId,
                townOwnerAddress: this.townOwnerAddress,
                chainId: this.chainId,
                provider: this.provider,
            })
        }
        return this.towns[spaceId]
    }
}
