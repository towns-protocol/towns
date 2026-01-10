import type { NodeStructOutput } from '@towns-protocol/generated/dev/typings/INodeRegistry'
import { RiverRegistry, web3Env } from '@towns-protocol/web3'
import { ethers } from 'ethers'

const NODE_STATUS = {
    ACTIVE: 2,
    FAILED: 3,
    DEPARTING: 4,
}

// This class is in charge of pulling all nodes from river and
// formatting them into a prometheus-friendly format

export class MetricsDiscovery {
    constructor(
        private readonly riverRegistry: RiverRegistry,
        private readonly env: string,
    ) {}

    public static init(config: { riverRpcURL: string; env: string }) {
        const deployment = web3Env().getDeployment(config.env)
        const provider = new ethers.providers.JsonRpcProvider(config.riverRpcURL)
        const riverRegistry = new RiverRegistry(deployment.river, provider)
        return new MetricsDiscovery(riverRegistry, config.env)
    }

    public static isTargeted(node: NodeStructOutput) {
        return (
            node.status === NODE_STATUS.ACTIVE ||
            node.status === NODE_STATUS.DEPARTING ||
            node.status === NODE_STATUS.FAILED
        )
    }

    private async getTargetNodes() {
        // eslint-disable-next-line no-console
        console.info('Getting target nodes')
        const allNodes = await this.riverRegistry.nodeRegistry.read.getAllNodes()
        return allNodes.filter((node) => MetricsDiscovery.isTargeted(node))
    }

    public nodeToTargetEntry(node: NodeStructOutput) {
        const url = new URL(node.url)
        const host = url.hostname
        return {
            labels: {
                node_url: node.url,
                env: this.env,
            },
            targets: [host],
        }
    }

    public async getPrometheusTargets() {
        const targetNodes = await this.getTargetNodes()
        const prometheusTargets = targetNodes.map((node) => this.nodeToTargetEntry(node))
        const prometheusTargetsJSON = JSON.stringify(prometheusTargets, null, 2)
        return prometheusTargetsJSON
    }
}
