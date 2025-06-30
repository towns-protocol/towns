import { ContractTransaction, ethers } from 'ethers'
import { ISpaceOwnerBase } from '@towns-protocol/generated/dev/typings/SpaceOwner'
import { BaseContractShim, OverrideExecution } from '../BaseContractShim'
import { SpaceOwner__factory } from '@towns-protocol/generated/dev/typings/factories/SpaceOwner__factory'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'
import { TransactionOpts } from '../types/ContractTypes'
import { SpaceAddressFromSpaceId } from '../utils/ut'

class SpaceOwnerGetSpaceInfo implements Keyable {
    spaceAddress: string
    constructor(spaceAddress: string) {
        this.spaceAddress = spaceAddress
    }
    toKey(): string {
        return `getSpaceInfo:${this.spaceAddress}`
    }
}

export type { ISpaceOwnerBase }

const { abi, connect } = SpaceOwner__factory

export class SpaceOwner extends BaseContractShim<typeof connect> {
    private readonly spaceInfoCache: SimpleCache<
        SpaceOwnerGetSpaceInfo,
        ISpaceOwnerBase.SpaceStructOutput
    >

    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)

        this.spaceInfoCache = new SimpleCache({
            ttlSeconds: 15 * 60,
        })
    }

    public async getSpaceInfo(
        spaceAddress: string,
    ): Promise<ISpaceOwnerBase.SpaceStructOutput> {
        return this.spaceInfoCache.executeUsingCache(
            new SpaceOwnerGetSpaceInfo(spaceAddress),
            async () => this.read.getSpaceInfo(spaceAddress),
        )
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }

    public async updateSpaceInfo<T = ContractTransaction>(args: {
        spaceId: string
        name: string
        uri: string
        shortDescription: string
        longDescription: string
        signer: ethers.Signer
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }) {
        const {
            overrideExecution,
            transactionOpts,
            spaceId,
            name,
            uri,
            shortDescription,
            longDescription,
            signer,
        } = args

        const spaceAddress = SpaceAddressFromSpaceId(spaceId)

        const result = await this.executeCall({
            signer,
            functionName: 'updateSpaceInfo',
            args: [spaceAddress, name, uri, shortDescription, longDescription],
            overrideExecution,
            transactionOpts,
        })
        this.spaceInfoCache.remove(new SpaceOwnerGetSpaceInfo(spaceAddress))
        return result
    }
}
