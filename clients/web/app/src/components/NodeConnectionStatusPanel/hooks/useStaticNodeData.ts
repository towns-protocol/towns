import { useMemo, useState } from 'react'

const colors = [
    '#1DDCF2',
    '#AFDD79',
    '#FED83D',
    '#C740F2',
    '#9558FA',
    '#FEA56F',
    '#FF60B2',
    '#FEA56F',
    '#DBDE54',
]

export const useStaticNodeData = () => {
    const [nodeNames] = useState(() => [
        `https://river1.nodes.gamma.towns.com`,
        `https://river2.nodes.gamma.towns.com`,
        `https://river3.nodes.gamma.towns.com`,
        `https://river4.nodes.gamma.towns.com`,
        `https://river5.nodes.gamma.towns.com`,
        `https://river6.nodes.gamma.towns.com`,
        `https://river7.nodes.gamma.towns.com`,
        `https://river8.nodes.gamma.towns.com`,
        `https://river9.nodes.gamma.towns.com`,
        `https://river10.nodes.gamma.towns.com`,
        `https://river11.nodes.gamma.towns.com`,
        `https://towns-devnet.staking.production.figment.io`,
        `https://river1.river-testnet.nodes.unit410.com`,
    ])

    const nodeConnections = useMemo(() => {
        return nodeNames.map((nodeUrl, i) => {
            return {
                id: nodeUrl,
                nodeUrl,
                color: colors[i % colors.length],
            }
        })
    }, [nodeNames])

    return nodeConnections
}
