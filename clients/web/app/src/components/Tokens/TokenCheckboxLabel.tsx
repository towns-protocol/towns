import React from 'react'
import { Box } from '@ui'

export function TokenCheckboxLabel(props: {
    tokens: string[] // needs to be parsed from ruleData
    label: string
}): JSX.Element {
    return (
        <Box>
            <Box>{props.label}</Box>
            {props.tokens && props.tokens.length > 0 && (
                <Box horizontal gap="lg" paddingTop="md">
                    {props.tokens?.map((t) => t)}
                </Box>
            )}
        </Box>
    )
}
