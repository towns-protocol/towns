import { Address } from 'viem'

export interface RiverNode {
    status: number
    url: string
    nodeAddress: Address
    operator: Address
}
