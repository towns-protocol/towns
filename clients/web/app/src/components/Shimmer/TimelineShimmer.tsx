import React from 'react'
import { Box, Stack } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'

export const TimelineShimmer = () => {
    return (
        <Box absoluteFill padding>
            <Stack grow>
                <Stack gap="lg" padding="sm">
                    <Box grow horizontal paddingBottom="sm">
                        <Box grow className={shimmerClass} height="1" />
                    </Box>
                    {Array(10)
                        .fill(undefined)
                        .map((_, i) => i)
                        .map((k, _, a) => {
                            return (
                                <Stack gap key={`${k}`} style={{ opacity: 1 - (1 / a.length) * k }}>
                                    <Stack horizontal gap>
                                        <Box
                                            width="x6"
                                            height="x6"
                                            aspectRatio="1/1"
                                            rounded="full"
                                            className={shimmerClass}
                                        />
                                        <Stack flexGrow="h8" gap="md">
                                            <Stack
                                                width="300"
                                                height="height_sm"
                                                className={shimmerClass}
                                                rounded="xs"
                                            />
                                            <Stack
                                                height="height_sm"
                                                className={shimmerClass}
                                                rounded="xs"
                                            />
                                            <Stack
                                                height="height_sm"
                                                className={shimmerClass}
                                                rounded="xs"
                                            />
                                            <Stack className={shimmerClass} rounded="xs" />
                                        </Stack>
                                    </Stack>
                                </Stack>
                            )
                        })}
                </Stack>
                <Stack grow bottom left padding="lg" position="absolute" width="100%">
                    <Box grow className={shimmerClass} height="x7" rounded="sm" />
                </Stack>
            </Stack>
        </Box>
    )
}
