import { ethers } from 'ethers'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { INodeOperatorShim } from './INodeOperatorShim'
import { IEntitlementCheckerShim } from './IEntitlementCheckerShim'
import { ISpaceDelegationShim } from './ISpaceDelegationShim'
import { IERC721AShim } from './IERC721AShim'

export type BaseOperator = {
    operatorAddress: string
    status: number
}

export class BaseRegistry {
    public readonly config: BaseChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly nodeOperator: INodeOperatorShim
    public readonly entitlementChecker: IEntitlementCheckerShim
    public readonly spaceDelegation: ISpaceDelegationShim
    public readonly erc721A: IERC721AShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.config = config
        this.provider = provider
        this.nodeOperator = new INodeOperatorShim(
            config.addresses.baseRegistry,
            config.contractVersion,
            provider,
        )
        this.entitlementChecker = new IEntitlementCheckerShim(
            config.addresses.baseRegistry,
            config.contractVersion,
            provider,
        )
        this.spaceDelegation = new ISpaceDelegationShim(
            config.addresses.baseRegistry,
            config.contractVersion,
            provider,
        )
        this.erc721A = new IERC721AShim(
            config.addresses.baseRegistry,
            config.contractVersion,
            provider,
        )
    }

    private async ownerOf(tokenId: number) {
        return this.erc721A.read.ownerOf(tokenId)
    }

    private async getOperatorStatus(operator: string) {
        return this.nodeOperator.read.getOperatorStatus(operator)
    }

    async getOperators(): Promise<BaseOperator[]> {
        const totalSupplyBigInt = await this.erc721A.read.totalSupply()
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

        return operators
    }

    private async getNodeCount() {
        return this.entitlementChecker.read.getNodeCount()
    }

    private async getNodeAtIndex(index: number) {
        return this.entitlementChecker.read.getNodeAtIndex(index)
    }

    public async getNodes() {
        const nodeCountBigInt = await this.getNodeCount()
        const nodeCount = Number(nodeCountBigInt)
        const zeroToNodeCount = Array.from(Array(nodeCount).keys())
        const nodeAtIndexPromises = zeroToNodeCount.map((index) => this.getNodeAtIndex(index))
        const nodes = await Promise.all(nodeAtIndexPromises)

        return nodes
    }
}
