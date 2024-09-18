import { RiverMetrics } from './metrics-extractor'
import fs from 'fs/promises'
import { exists } from './utils'
import path from 'path'

const ARTIFACTS_ROOT_DIR = 'artifacts'

export class MetricsArtifacts {
    private readonly artifactsDir: string

    constructor(private readonly metrics: RiverMetrics) {
        const timestamp = new Date().toISOString().replace(/[:\-T.]/g, '_')
        this.artifactsDir = path.join(ARTIFACTS_ROOT_DIR, timestamp)
    }

    public async createArtifacts() {
        await this.setup()
        await this.generateNumMembershipsPerUserCSV()
        await this.generateNumMembershipsPerSpaceCSV()
        await this.generateNodesJSON()
        await this.generateOperatorsJSON()
        await this.generatePingResultsJSON()
        await this.generateSpaceMembershipsJSON()
        await this.generateAggregateStatsJSON()
    }

    private async setup() {
        // create the artifacts directory if it doesn't exist:
        if (!(await exists(this.artifactsDir))) {
            console.log(`Creating artifacts directory: ${this.artifactsDir}`)
            await fs.mkdir(this.artifactsDir, {
                recursive: true,
            })
        }
    }

    private async generateNumMembershipsPerUserCSV() {
        const destination = path.join(this.artifactsDir, 'numMembershipsPerUser.csv')
        const numMembershipsPerUser = Array.from(this.metrics.memberAddressToNumMemberships)
            .sort((a, b) => b[1] - a[1])
            .map(([address, numMemberships]) => `${address}, ${numMemberships}`)

        await fs.writeFile(destination, numMembershipsPerUser.join('\n'))
        console.log(`Created: ${destination}`)
    }

    private async generateNumMembershipsPerSpaceCSV() {
        const destination = path.join(this.artifactsDir, 'numMembershipsPerSpace.csv')
        if (this.metrics.spacesWithMemberships.kind === 'success') {
            const numMembershipsPerSpace = this.metrics.spacesWithMemberships.result
                .sort((b, a) => a.numMemberships - b.numMemberships)
                .map(({ address, numMemberships }) => `${address}, ${numMemberships}`)
            await fs.writeFile(destination, numMembershipsPerSpace.join('\n'))
            console.log(`Created: ${destination}`)
        }
    }

    private async generateNodesJSON() {
        const destination = path.join(this.artifactsDir, 'nodes.json')
        await fs.writeFile(destination, JSON.stringify(this.metrics.combinedNodes, null, 2))
        console.log(`Created: ${destination}`)
    }

    private async generateOperatorsJSON() {
        const destination = path.join(this.artifactsDir, 'operators.json')
        await fs.writeFile(
            destination,
            JSON.stringify(this.metrics.combinedOperatorsWithNodes, null, 2),
        )
        console.log(`Created: ${destination}`)
    }

    private async generatePingResultsJSON() {
        const destination = path.join(this.artifactsDir, 'pingResults.json')
        await fs.writeFile(destination, JSON.stringify(this.metrics.nodePingResults, null, 2))
        console.log(`Created: ${destination}`)
    }

    private async generateSpaceMembershipsJSON() {
        const destination = path.join(this.artifactsDir, 'spaceMemberships.json')
        await fs.writeFile(destination, JSON.stringify(this.metrics.spacesWithMemberships, null, 2))
        console.log(`Created: ${destination}`)
    }

    private async generateAggregateStatsJSON() {
        const destination = path.join(this.artifactsDir, 'aggregateStats.json')
        await fs.writeFile(destination, JSON.stringify(this.metrics.aggregateNetworkStats, null, 2))
        console.log(`Created: ${destination}`)
    }
}
