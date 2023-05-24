import React from 'react'
import { Box, BoxProps, Paragraph, Stack } from '@ui'
import { darkClass, lightClass } from 'ui/styles/globals/storybook.css'

export const Container = ({
    label,
    children,
    darkOnly,
    ...boxProps
}: { label: string; darkOnly?: boolean } & BoxProps) => (
    <Stack horizontal>
        {[darkClass, lightClass]
            .filter((c) => !darkOnly || c === darkClass)
            .map((c) => (
                <Stack grow padding key={c} className={c} background="default" color="default">
                    <Stack border grow rounded="xs">
                        <Box padding background="level2">
                            <Paragraph size="lg" color="gray2">
                                {label}
                            </Paragraph>
                        </Box>
                        <Stack padding gap {...boxProps}>
                            {children}
                        </Stack>
                    </Stack>
                </Stack>
            ))}
    </Stack>
)
