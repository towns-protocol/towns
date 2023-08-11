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
    private readonly towns: TownRegistry = {}

    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        this.chainId = chainId
        this.provider = provider
        this.townArchitect = new ITownArchitectShim(address, chainId, provider)
    }

    public get TownArchitect(): ITownArchitectShim {
        return this.townArchitect
    }

    public async getTown(townId: string): Promise<Town | undefined> {
        if (this.towns[townId] === undefined) {
            const townAddress = await this.townArchitect.read.getTownById(townId)
            this.towns[townId] = new Town(townAddress, townId, this.chainId, this.provider)
        }
        return this.towns[townId]
    }
}
