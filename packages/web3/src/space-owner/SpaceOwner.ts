import { ContractTransaction, ethers, Signer } from 'ethers'
import { ISpaceOwnerBase } from '@towns-protocol/generated/dev/typings/SpaceOwner'
import { BaseContractShim, OverrideExecution } from '../BaseContractShim'
import { SpaceOwner__factory } from '@towns-protocol/generated/dev/typings/factories/SpaceOwner__factory'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'
import { TransactionOpts } from '../types/ContractTypes'
import { SpaceAddressFromSpaceId } from '../utils/ut'
import { GuardianFacetShim } from './GuardianFacetShim'
import { SpaceDappCreateStorageFn } from '../space-dapp/SpaceDapp'

export type { ISpaceOwnerBase }

const { abi, connect } = SpaceOwner__factory

export class SpaceOwner extends BaseContractShim<typeof connect> {
    private readonly spaceInfoCache: SimpleCache<ISpaceOwnerBase.SpaceStructOutput>
    private readonly guardianFacet: GuardianFacetShim

    constructor(
        address: string,
        provider: ethers.providers.Provider,
        createStorageFn: SpaceDappCreateStorageFn | undefined,
    ) {
        super(address, provider, connect, abi)

        this.guardianFacet = new GuardianFacetShim(address, provider)

        this.spaceInfoCache = new SimpleCache({
            ttlSeconds: 15 * 60,
            createStorageFn,
        })
    }

    public async getSpaceInfo(spaceAddress: string): Promise<ISpaceOwnerBase.SpaceStructOutput> {
        return this.spaceInfoCache.executeUsingCache(
            Keyable.spaceInfoRequest(spaceAddress),
            async () => this.read.getSpaceInfo(spaceAddress),
        )
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }

    public async ownerOf(tokenId: string): Promise<string> {
        return this.read.ownerOf(tokenId)
    }

    public async isGuardianEnabled(ownerAddress: string): Promise<boolean> {
        return this.guardianFacet.read.isGuardianEnabled(ownerAddress)
    }

    public async guardianCooldown(ownerAddress: string): Promise<bigint> {
        return (await this.guardianFacet.read.guardianCooldown(ownerAddress)).toBigInt()
    }

    public async getDefaultCooldown(): Promise<bigint> {
        return (await this.guardianFacet.read.getDefaultCooldown()).toBigInt()
    }

    public async enableGuardian<T = ContractTransaction>(args: {
        signer: Signer
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }): Promise<T extends undefined ? ContractTransaction : T> {
        const { signer, overrideExecution, transactionOpts } = args
        return this.guardianFacet.executeCall({
            signer,
            functionName: 'enableGuardian',
            args: [],
            overrideExecution,
            transactionOpts,
        })
    }

    public async disableGuardian<T = ContractTransaction>(args: {
        signer: Signer
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }) {
        const { signer, overrideExecution, transactionOpts } = args
        return this.guardianFacet.executeCall({
            signer,
            functionName: 'disableGuardian',
            args: [],
            overrideExecution,
            transactionOpts,
        })
    }

    public async transferOwnership<T = ContractTransaction>(args: {
        from: string
        to: string
        tokenId: string
        signer: Signer
        overrideExecution?: OverrideExecution<T>
        transactionOpts?: TransactionOpts
    }) {
        const { from, to, tokenId, signer, overrideExecution, transactionOpts } = args
        return this.executeCall({
            signer,
            functionName: 'transferFrom',
            args: [from, to, tokenId],
            overrideExecution,
            transactionOpts,
        })
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
        await this.spaceInfoCache.remove(Keyable.spaceInfoRequest(spaceAddress))
        return result
    }
}
