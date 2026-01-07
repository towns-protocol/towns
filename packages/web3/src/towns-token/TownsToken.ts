import { ethers } from 'ethers'
import { Towns as ITownsBase } from '@towns-protocol/generated/dev/typings/Towns'
import { BaseContractShim } from '../BaseContractShim'
import { Towns__factory } from '@towns-protocol/generated/dev/typings/factories/Towns__factory'
import { Keyable } from '../cache/Keyable'
import { SimpleCache } from '../cache/SimpleCache'

export type { ITownsBase }

const { abi, connect } = Towns__factory

export class TownsToken extends BaseContractShim<typeof connect> {
    private readonly balanceCache: SimpleCache<ethers.BigNumber>

    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)

        this.balanceCache = new SimpleCache({
            ttlSeconds: 1 * 60, // 1 minute
        })
    }

    public async getBalance(accountAddress: string): Promise<ethers.BigNumber> {
        return this.balanceCache.executeUsingCache(
            Keyable.balanceOfRequest(accountAddress),
            async () => this.read.balanceOf(accountAddress),
        )
    }

    public async name(): Promise<string> {
        return this.read.name()
    }

    public async symbol(): Promise<string> {
        return this.read.symbol()
    }

    public async decimals(): Promise<number> {
        const decimalsBN = await this.read.decimals()
        return ethers.BigNumber.from(decimalsBN).toNumber()
    }

    public async totalSupply(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }
}
