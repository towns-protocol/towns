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

export type BaseNodeWithOperator = { node: string; operator: BaseOperator }

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

    private async getOperatorStatus(operator: string) {
        return this.nodeOperator.read.getOperatorStatus(operator)
    }

    async getOperators(): Promise<BaseOperator[]> {
        const operatorAddresses = await this.nodeOperator.read.getOperators()
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

    public async getNodesWithOperators(): Promise<BaseNodeWithOperator[]> {
        const operators = await this.getOperators()
        const nodesByOperatorPromises = operators.map((operator) =>
            this.entitlementChecker.read.getNodesByOperator(operator.operatorAddress),
        )
        const nodesByOperator = await Promise.all(nodesByOperatorPromises)
        const operatorsWithNodes = operators.map((operator, index) => ({
            operator,
            nodes: nodesByOperator[index],
        }))

        const nodesWithOperators: BaseNodeWithOperator[] = []
        operatorsWithNodes.forEach(({ operator, nodes }) => {
            nodes.forEach((node) => {
                nodesWithOperators.push({ node, operator })
            })
        })

        return nodesWithOperators
    }
}
