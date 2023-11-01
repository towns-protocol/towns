import { IStaticContractsInfoV4 } from './IStaticContractsInfoV4'
import { ITownArchitectShim } from './ITownArchitectShim'
import { Address, PublicClient, zeroAddress } from 'viem'
import { Town } from './Town'

interface TownRegistry {
    [townId: string]: Town
}

export class TownRegistrar {
    private readonly chainId: number
    private readonly publicClient: PublicClient | undefined
    private readonly townArchitect: ITownArchitectShim
    private readonly townOwnerAddress: Address
    private readonly towns: TownRegistry = {}

    constructor(
        contractsInfo: IStaticContractsInfoV4,
        chainId: number,
        publicClient: PublicClient | undefined,
    ) {
        this.chainId = chainId
        this.publicClient = publicClient
        this.townOwnerAddress = contractsInfo.townOwnerAddress
        this.townArchitect = new ITownArchitectShim(
            contractsInfo.townFactoryAddress,
            chainId,
            publicClient,
        )
    }

    public get TownArchitect(): ITownArchitectShim {
        return this.townArchitect
    }

    public async getTown(spaceId: string): Promise<Town | undefined> {
        if (this.towns[spaceId] === undefined) {
            const townAddress = await this.townArchitect.read({
                functionName: 'getTownById',
                args: [spaceId],
            })
            if (!townAddress || townAddress === zeroAddress) {
                return undefined // town is not found
            }

            this.towns[spaceId] = new Town({
                address: townAddress,
                spaceId: spaceId,
                townOwnerAddress: this.townOwnerAddress,
                chainId: this.chainId,
                publicClient: this.publicClient,
            })
        }

        return this.towns[spaceId]
    }
}
