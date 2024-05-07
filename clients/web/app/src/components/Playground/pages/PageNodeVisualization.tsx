import React, { useCallback, useMemo, useState } from 'react'
import { Box, Checkbox } from '@ui'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'

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
                <NodeAnimationContext.Provider value={config}>
                    <NodeAnimationLoader />
                </NodeAnimationContext.Provider>
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
