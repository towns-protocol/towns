import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { BaseOperator, BaseNodeWithOperator } from '@river-build/web3'

export type CombinedOperator = {
    operatorAddress: string
    baseOperatorStatus: number
    riverOperatorStatus: number
}

export type CombinedNode = {
    nodeAddress: string
    baseStatus: number
    baseOperator?: string
    riverStatus: number
    riverOperator?: string
    url?: string
    isMissingOnRiver: boolean
    isMissingOnBase: boolean
}

export class MetricsIntegrator {
    public combineOperators(
        baseOperators: BaseOperator[],
        riverOperators: string[],
    ): CombinedOperator[] {
        console.log('combining operators')
        const baseOperatorAddresses = baseOperators.map((operator) => operator.operatorAddress)
        const baseOperatorMap = new Map(
            baseOperators.map((operator) => [operator.operatorAddress, operator]),
        )
        const riverOperatorAddressSet = new Set(riverOperators)
        const allOperatorAddressesSet = new Set(riverOperators.concat(baseOperatorAddresses))
        const allOperatorAddresses = Array.from(allOperatorAddressesSet)
        const combinedOperators: CombinedOperator[] = allOperatorAddresses.map(
            (operatorAddress) => {
                const baseOperator = baseOperatorMap.get(operatorAddress)
                let baseOperatorStatus = -1 // -1 means not found
                if (baseOperator) {
                    baseOperatorStatus = baseOperator.status
                }

                const riverOperatorStatus = riverOperatorAddressSet.has(operatorAddress) ? 1 : -1
                return {
                    operatorAddress,
                    baseOperatorStatus,
                    riverOperatorStatus,
                }
            },
        )
        console.log('combined operators')
        return combinedOperators
    }

    public combineNodes(
        nodesOnBase: BaseNodeWithOperator[],
        nodesOnRiver: NodeStructOutput[],
    ): CombinedNode[] {
        console.log('combining nodes')
        const nodesOnRiverAddresses = nodesOnRiver.map((node) => node.nodeAddress)
        const nodesOnRiverMap = new Map(nodesOnRiver.map((node) => [node.nodeAddress, node]))

        const nodesOnBaseAddresses = nodesOnBase.map((baseNode) => baseNode.node)
        const nodesOnBaseMap = new Map(nodesOnBase.map((baseNode) => [baseNode.node, baseNode]))

        const allNodeAddressesSet = new Set(nodesOnBaseAddresses.concat(nodesOnRiverAddresses))
        const allNodeAddresses = Array.from(allNodeAddressesSet)

        const combinedNodes = allNodeAddresses.map((nodeAddress) => {
            const nodeOnRiver = nodesOnRiverMap.get(nodeAddress)
            const nodeOnBase = nodesOnBaseMap.get(nodeAddress)

            const isOperationalOnBase = !!nodeOnBase
            const isOperationalOnRiver = nodeOnRiver?.status === 2 // (2 means operational on river chain)

            return {
                nodeAddress,
                baseStatus: isOperationalOnBase ? 1 : -1,
                riverStatus: nodeOnRiver?.status ?? -1,
                riverOperator: nodeOnRiver?.operator,
                baseOperator: nodeOnBase?.operator.operatorAddress,
                url: nodeOnRiver?.url,
                isMissingOnRiver: isOperationalOnBase && !isOperationalOnRiver,
                isMissingOnBase: isOperationalOnRiver && !isOperationalOnBase,
            }
        })
        console.log('combined nodes')
        return combinedNodes
    }

    public enrichNodesWithOperators(nodes: CombinedNode[], operators: CombinedOperator[]) {
        console.log('combining nodes with operators')
        const operatorMap = new Map(
            operators.map((operator) => [operator.operatorAddress, operator]),
        )
        const result = nodes.map((node) => {
            const riverOperator = node.riverOperator
                ? operatorMap.get(node.riverOperator)
                : undefined
            const baseOperator = node.baseOperator ? operatorMap.get(node.baseOperator) : undefined
            return {
                ...node,
                riverOperator,
                baseOperator,
            }
        })

        console.log('combined nodes with operators')

        return result
    }

    public enrichOperatorsWithNodes(operators: CombinedOperator[], nodes: CombinedNode[]) {
        console.log('combining operators with nodes')
        const result = operators.map((operator) => {
            const nodesOperatedByOperator = nodes.filter(
                (node) =>
                    node.baseOperator === operator.operatorAddress ||
                    node.riverOperator === operator.operatorAddress,
            )
            return {
                ...operator,
                nodes: nodesOperatedByOperator,
            }
        })

        console.log('combined operators with nodes')

        return result
    }
}
