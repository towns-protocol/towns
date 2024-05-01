import React, { useCallback, useMemo, useState } from 'react'
import { Box, Checkbox } from '@ui'
import { NodeVisualization } from '@components/NodeVisualization/NodeVisualization'
import {
    DEFAULT_CONFIG,
    NodeVisualizationContext,
} from '@components/NodeVisualization/NodeVisualizationContext'

export const PageNodeVisualization = () => {
    const [options, setOptions] = useState(() => ({ spinning: true, animateNodes: true }))
    const toggleOption = useCallback(
        (key: keyof typeof options) => setOptions((state) => ({ ...state, [key]: !state[key] })),
        [],
    )

    const config = useMemo(
        () => ({ ...DEFAULT_CONFIG, animateNodes: options.animateNodes }),
        [options.animateNodes],
    )

    console.log(config)

    return (
        <Box centerContent absoluteFill gap>
            <Box rounded="md" width="300" background="level2">
                <NodeVisualizationContext.Provider value={config}>
                    <NodeVisualization />
                </NodeVisualizationContext.Provider>
            </Box>
            <Box width="300">
                <Checkbox
                    labelLast
                    label="animateNodes"
                    name="spin"
                    checked={options.animateNodes}
                    onChange={() => toggleOption('animateNodes')}
                />
            </Box>
        </Box>
    )
}
