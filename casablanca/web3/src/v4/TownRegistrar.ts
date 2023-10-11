import { IStaticContractsInfoV4 } from './IStaticContractsInfoV4'
import { ITownArchitectShim } from './ITownArchitectShim'
import { Address, Chain, PublicClient, Transport, zeroAddress } from 'viem'

// TEMPORARY, replace with Town class
type Town = any

interface TownRegistry {
    [townId: string]: Town
}

export class TownRegistrar<T extends Transport, C extends Chain> {
    private readonly chainId: number
    private readonly publicClient: PublicClient<T, C> | undefined
    private readonly townArchitect: ITownArchitectShim<T, C>
    private readonly townOwnerAddress: Address
    private readonly towns: TownRegistry = {}

    constructor(
        contractsInfo: IStaticContractsInfoV4,
        chainId: number,
        publicClient: PublicClient<T, C> | undefined,
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

    public get TownArchitect(): ITownArchitectShim<T, C> {
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
            // TODO

            // this.towns[spaceId] = new Town({
            //     address: townAddress,
            //     spaceId: spaceId,
            //     townOwnerAddress: this.townOwnerAddress,
            //     chainId: this.chainId,
            //     provider: this.provider,
            // })
        }
        // return this.towns[spaceId]
    }
}
