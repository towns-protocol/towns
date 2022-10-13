import React from 'react'
import { Box, Paragraph, TooltipRenderer } from '@ui'

export const ButtonTooltip = ({
    children,
    message: label,
}: {
    message: string | undefined
    children: React.ReactNode
}) => (
    <TooltipRenderer
        render={
            label ? (
                <Box
                    border
                    padding="sm"
                    rounded="sm"
                    background="level2"
                    style={{ width: 'max-content' }}
                    maxWidth="200"
                >
                    <Paragraph size="sm">{label}</Paragraph>
                </Box>
            ) : undefined
        }
        layoutId=""
        placement="vertical"
    >
        {(props) => (
            <Box {...props.triggerProps} width="max-content" textAlign="center">
                {children}
            </Box>
        )}
    </TooltipRenderer>
)
