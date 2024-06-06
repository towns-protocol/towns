import { Address, PublicClient } from 'viem'
import { RiverNode } from './river-node'

const RIVER_REGISTRY_ABI = [
    {
        type: 'function',
        name: 'getAllNodes',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'tuple[]',
                internalType: 'struct Node[]',
                components: [
                    {
                        name: 'status',
                        type: 'uint8',
                        internalType: 'enum NodeStatus',
                    },
                    {
                        name: 'url',
                        type: 'string',
                        internalType: 'string',
                    },
                    {
                        name: 'nodeAddress',
                        type: 'address',
                        internalType: 'address',
                    },
                    {
                        name: 'operator',
                        type: 'address',
                        internalType: 'address',
                    },
                ],
            },
        ],
        stateMutability: 'view',
    },
]

export class RiverRegistry {
    private client: PublicClient
    private address: Address

    constructor(params: { client: PublicClient; address: Address }) {
        this.client = params.client
        this.address = params.address
    }

    async getAllNodes(): Promise<RiverNode[]> {
        const nodes = await this.client.readContract({
            abi: RIVER_REGISTRY_ABI,
            address: this.address,
            functionName: 'getAllNodes',
        })

        console.log(`Got nodes: `, nodes)

        return nodes as RiverNode[]
    }
}
