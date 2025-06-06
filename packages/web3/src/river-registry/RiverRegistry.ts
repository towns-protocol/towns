import { ethers } from 'ethers'
import { NodeStructOutput } from '@towns-protocol/generated/dev/typings/INodeRegistry'
import { RiverChainConfig } from '../utils/IStaticContractsInfo'
import { INodeRegistryShim } from './INodeRegistryShim'
import { IStreamRegistryShim } from './IStreamRegistryShim'
import { IOperatorRegistryShim } from './IOperatorRegistryShim'
import { StreamStructOutput } from '@towns-protocol/generated/dev/typings/IStreamRegistry'

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
        this.nodeRegistry = new INodeRegistryShim(config.addresses.riverRegistry, provider)
        this.streamRegistry = new IStreamRegistryShim(config.addresses.riverRegistry, provider)
        this.operatorRegistry = new IOperatorRegistryShim(config.addresses.riverRegistry, provider)
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
        return nodeUrls
            .sort()
            .map((x) => x.url)
            .join(',')
    }

    async getStreamCount(): Promise<ethers.BigNumber> {
        return this.streamRegistry.read.getStreamCount()
    }

    async getStream(streamAddress: Uint8Array): Promise<StreamStructOutput> {
        return this.streamRegistry.read.getStream(streamAddress)
    }

    async streamExists(streamAddress: Uint8Array): Promise<boolean> {
        try {
            await this.getStream(streamAddress)
            return true
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if ((error as any).reason === 'NOT_FOUND') {
                return false
            }
            throw error
        }
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
