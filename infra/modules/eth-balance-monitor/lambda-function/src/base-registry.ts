import { Address, PublicClient } from 'viem'
import IERC721AAbi from '@river-build/generated/dev/abis/IERC721A.abi'
import INodeOperatorAbi from '@river-build/generated/dev/abis/INodeOperator.abi'
import IEntitlementCheckerAbi from '@river-build/generated/dev/abis/IEntitlementChecker.abi'

export type BaseOperator = {
    operatorAddress: Address
    status: number
}

export class BaseRegistry {
    private client: PublicClient
    private address: Address

    constructor(params: { client: PublicClient; address: Address }) {
        this.client = params.client
        this.address = params.address
    }

    private async totalSupply() {
        const totalSupply = await this.client.readContract({
            abi: IERC721AAbi,
            address: this.address,
            functionName: 'totalSupply',
        })

        console.log('Got total supply from BaseRegistry', Number(totalSupply))

        return totalSupply
    }

    private async ownerOf(tokenId: number) {
        return this.client.readContract({
            abi: IERC721AAbi,
            address: this.address,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
        })
    }

    private async getOperatorStatus(operator: Address) {
        return this.client.readContract({
            abi: INodeOperatorAbi,
            address: this.address,
            functionName: 'getOperatorStatus',
            args: [operator],
        })
    }

    async getOperators(): Promise<BaseOperator[]> {
        const totalSupplyBigInt = await this.totalSupply()
        const totalSupply = Number(totalSupplyBigInt)
        const zeroToTotalSupply = Array.from(Array(totalSupply).keys())
        const operatorsPromises = zeroToTotalSupply.map((tokenId) => this.ownerOf(tokenId))
        const operatorAddresses = await Promise.all(operatorsPromises)
        const operatorStatusPromises = operatorAddresses.map((operatorAddress) =>
            this.getOperatorStatus(operatorAddress),
        )
        const operatorsStatus = await Promise.all(operatorStatusPromises)
        const operators = operatorAddresses.map((operatorAddress, index) => ({
            operatorAddress,
            status: operatorsStatus[index],
        }))

        console.log('got operators from BaseRegistry', operators)

        return operators
    }

    private async getNodeCount() {
        return this.client.readContract({
            abi: IEntitlementCheckerAbi,
            address: this.address,
            functionName: 'getNodeCount',
        })
    }

    private async getNodeAtIndex(index: number) {
        return this.client.readContract({
            abi: IEntitlementCheckerAbi,
            address: this.address,
            functionName: 'getNodeAtIndex',
            args: [BigInt(index)],
        })
    }

    public async getNodes() {
        const nodeCountBigInt = await this.getNodeCount()
        const nodeCount = Number(nodeCountBigInt)
        const zeroToNodeCount = Array.from(Array(nodeCount).keys())
        const nodeAtIndexPromises = zeroToNodeCount.map((index) => this.getNodeAtIndex(index))
        const nodes = await Promise.all(nodeAtIndexPromises)

        console.log('got nodes from BaseRegistry', nodes)

        return nodes
    }
}
