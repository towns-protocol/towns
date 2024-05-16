import { useMemo } from 'react'
import { Color } from 'three'
import { NODE_COLORS } from '@components/NodeConnectionStatusPanel/hooks/useNodeData'

export const useDummyNodes = ({ grayScale }: { grayScale?: boolean } = {}) => {
    return useMemo(() => {
        let operatorIndex = 0
        return Array.from({ length: 7 }).map((_, i, arr) => {
            if (i % 4 === 0) {
                operatorIndex++
            }
            return {
                id: `node-${i}`,
                index: i,
                nodeUrl: `https://node-${i}.example.com`,
                statusText: 'Connected',
                status: 2,
                operator: 'Example Operator',
                operatorAddress: '0x1234567890abcdef',
                operatorIndex,
                data: {},
                color: grayScale
                    ? new Color('#666')
                    : new Color(
                          NODE_COLORS[
                              Math.floor((i * NODE_COLORS.length) / arr.length) % NODE_COLORS.length
                          ],
                      ),
                operatorColor: new Color(NODE_COLORS[(3 + operatorIndex) % NODE_COLORS.length]),
            } as const
        })
    }, [grayScale])
}
