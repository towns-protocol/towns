import { NodeStructOutput } from '@river/generated/dev/typings/INodeRegistry'
import { getRiverChainContractsInfo } from '../IStaticContractsInfo'
import { IRiverRegistryShim } from './IRiverRegistryShim'
import { ethers } from 'ethers'

interface IRiverRegistry {
    [nodeAddress: string]: NodeStructOutput
}

interface NodeUrls {
    url: string
}

export class RiverRegistry {
    public readonly chainId: number
    public readonly provider: ethers.providers.Provider | undefined
    public readonly riverRegistry: IRiverRegistryShim
    public readonly registry: IRiverRegistry = {}

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        const contractsInfo = getRiverChainContractsInfo(chainId)
        if (contractsInfo.riverRegistryAddress === undefined) {
            throw new Error('RiverRegistry address is not defined')
        }
        this.chainId = chainId
        this.provider = provider
        this.riverRegistry = new IRiverRegistryShim(
            contractsInfo.riverRegistryAddress,
            chainId,
            provider,
        )
    }

    public async getAllNodes(nodeStatus?: number): Promise<IRiverRegistry | undefined> {
        const allNodes = await this.riverRegistry.read.getAllNodes()
        if (allNodes.length == 0) {
            return undefined
        }
        const registry: IRiverRegistry = {}
        for (const node of allNodes) {
            if (nodeStatus && node.status != nodeStatus) {
                continue
            }
            if (nodeStatus !== undefined) {
                registry[node.nodeAddress] = node
            }
            // update in-memory registry
            this.registry[node.nodeAddress] = node
        }
        if (nodeStatus !== undefined) {
            return registry
        }
        // if we've updated the entire registry return that
        return this.registry
    }

    public async getAllNodeUrls(nodeStatus?: number): Promise<NodeUrls[] | undefined> {
        const allNodes = await this.riverRegistry.read.getAllNodes()
        if (allNodes.length == 0) {
            return undefined
        }
        const nodeUrls: NodeUrls[] = []
        for (const node of allNodes) {
            // get all nodes with optional status
            if (nodeStatus && node.status != nodeStatus) {
                continue
            }
            nodeUrls.push({ url: node.url })
            // update registry
            this.registry[node.nodeAddress] = node
        }
        return nodeUrls
    }

    public async getOperationalNodeUrls(): Promise<string> {
        const NODE_OPERATIONAL = 2
        const nodeUrls = await this.getAllNodeUrls(NODE_OPERATIONAL)
        if (!nodeUrls || nodeUrls.length === 0) {
            throw new Error('No operational nodes found in registry')
        }
        return nodeUrls.map((x) => x.url).join(',')
    }
}
