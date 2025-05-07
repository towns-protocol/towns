import { ethers } from 'ethers'

import { ISpaceOwnerBase } from '@towns-protocol/generated/dev/typings/SpaceOwner'
import { BaseContractShim } from '../BaseContractShim'
import { SpaceOwner__factory } from '@towns-protocol/generated/dev/typings/factories/SpaceOwner__factory'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'
import { TransactionOpts } from '../types/ContractTypes'
import { Space } from '../space/Space'
import { wrapTransaction } from '../space-dapp/wrapTransaction'

export class GetSpaceInfo implements Keyable {
    spaceId: string
    constructor(spaceId: string) {
        this.spaceId = spaceId
    }
    toKey(): string {
        return `getSpaceInfo:${this.spaceId}`
    }
}

export type { ISpaceOwnerBase }

const { abi, connect } = SpaceOwner__factory

export class SpaceOwner extends BaseContractShim<typeof connect> {
    private readonly spaceInfoCache: SimpleCache<GetSpaceInfo, ISpaceOwnerBase.SpaceStructOutput>

    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)

        this.spaceInfoCache = new SimpleCache({
            ttlSeconds: 15 * 60,
        })
    }

    public async getSpaceInfo(spaceAddress: string): Promise<ISpaceOwnerBase.SpaceStructOutput> {
        return this.spaceInfoCache.executeUsingCache(new GetSpaceInfo(spaceAddress), async () =>
            this.read.getSpaceInfo(spaceAddress),
        )
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }

    public removeSpaceInfoCache(spaceId: string) {
        this.spaceInfoCache.remove(new GetSpaceInfo(spaceId))
    }

    public async updateSpaceInfo(args: {
        spaceId: string
        space: Space
        name: string
        uri: string
        shortDescription: string
        longDescription: string
        signer: ethers.Signer
        txnOpts?: TransactionOpts
    }) {
        const txn = wrapTransaction(
            () =>
                this.write(args.signer).updateSpaceInfo(
                    args.space.Address,
                    args.name,
                    args.uri,
                    args.shortDescription,
                    args.longDescription,
                ),
            args.txnOpts,
        )

        this.removeSpaceInfoCache(args.spaceId)
        return txn
    }
}
