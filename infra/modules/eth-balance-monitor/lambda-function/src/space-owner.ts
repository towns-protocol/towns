import { Address, PublicClient } from 'viem'
import SpaceOwnerAbi from '@river-build/generated/v3/abis/SpaceOwner.abi'

export class SpaceOwner {
    private client: PublicClient
    private address: Address

    constructor(params: { client: PublicClient; address: Address }) {
        this.client = params.client
        this.address = params.address
    }

    async totalSupply() {
        const totalSupply = await this.client.readContract({
            abi: SpaceOwnerAbi,
            address: this.address,
            functionName: 'totalSupply',
        })

        console.log('Got total supply', Number(totalSupply))

        return Number(totalSupply)
    }
}
