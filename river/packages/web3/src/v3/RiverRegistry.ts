import { NodeStructOutput } from '@river-build/generated/dev/typings/INodeRegistry'
import { RiverChainConfig } from '../IStaticContractsInfo'
import { INodeRegistryShim } from './INodeRegistryShim'
import { ethers } from 'ethers'
import { IStreamRegistryShim } from './IStreamRegistryShim'
import { IOperatorRegistryShim } from './IOperatorRegistryShim'

interface RiverNodesMap {
    [nodeAddress: string]: NodeStructOutput
}

interface NodeUrls {
    url: string
}

export class RiverRegistry {
    public readonly config: RiverChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly nodeRegistry: INodeRegistryShim
    public readonly streamRegistry: IStreamRegistryShim
    public readonly operatorRegistry: IOperatorRegistryShim
    public readonly riverNodesMap: RiverNodesMap = {}

    constructor(config: RiverChainConfig, provider: ethers.providers.Provider) {
        this.config = config
        this.provider = provider
        this.nodeRegistry = new INodeRegistryShim(
            this.config.addresses.riverRegistry,
            this.config.contractVersion,
            provider,
        )
        this.streamRegistry = new IStreamRegistryShim(
            this.config.addresses.riverRegistry,
            this.config.contractVersion,
            provider,
        )
        this.operatorRegistry = new IOperatorRegistryShim(
            this.config.addresses.riverRegistry,
            this.config.contractVersion,
            provider,
        )
    }

    public async getAllNodes(nodeStatus?: number): Promise<RiverNodesMap | undefined> {
        const allNodes = await this.nodeRegistry.read.getAllNodes()
        if (allNodes.length == 0) {
            return undefined
        }
        const registry: RiverNodesMap = {}
        for (const node of allNodes) {
            if (nodeStatus && node.status != nodeStatus) {
                continue
            }
            if (nodeStatus !== undefined) {
                registry[node.nodeAddress] = node
            }
            // update in-memory registry
            this.riverNodesMap[node.nodeAddress] = node
        }
        if (nodeStatus !== undefined) {
            return registry
        }
        // if we've updated the entire registry return that
        return this.riverNodesMap
    }

    public async getAllNodeUrls(nodeStatus?: number): Promise<NodeUrls[] | undefined> {
        const allNodes = await this.nodeRegistry.read.getAllNodes()
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
            this.riverNodesMap[node.nodeAddress] = node
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

    async getStreamCount(): Promise<ethers.BigNumber> {
        return this.streamRegistry.read.getStreamCount()
    }

    private async getStreamCountOnNode(nodeAddress: string): Promise<ethers.BigNumber> {
        return this.streamRegistry.read.getStreamCountOnNode(nodeAddress)
    }

    public async getStreamCountsOnNodes(nodeAddresses: string[]): Promise<ethers.BigNumber[]> {
        const getStreamCountOnNode = this.getStreamCountOnNode.bind(this)
        const promises = nodeAddresses.map(getStreamCountOnNode)
        return Promise.all(promises)
    }
}
