import React from 'react'
import { Box, Stack } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'

export const TimelineShimmer = (props: { children?: React.ReactNode }) => {
    return (
        <Box absoluteFill data-testid="timeline-shimmer" paddingTop="safeAreaInsetBottom">
            <Stack grow>
                <Stack gap="lg">
                    <Box
                        grow
                        horizontal
                        borderBottom
                        height="x8"
                        paddingX="lg"
                        gap="lg"
                        alignItems="center"
                    >
                        <Box square="square_lg" height="x1" className={shimmerClass} rounded="xs" />
                        <Box width="200" height="x2" className={shimmerClass} rounded="xs" />
                    </Box>
                    <Stack gap padding="lg">
                        {Array(10)
                            .fill(undefined)
                            .map((_, i) => i)
                            .map((k, _, a) => {
                                return (
                                    <Stack
                                        gap
                                        key={`${k}`}
                                        style={{ opacity: 1 - (1 / a.length) * k }}
                                    >
                                        <Stack horizontal gap>
                                            <Box
                                                width="x6"
                                                height="x6"
                                                aspectRatio="1/1"
                                                rounded="full"
                                                className={shimmerClass}
                                            />
                                            <Stack grow gap="sm">
                                                <Stack
                                                    width="200"
                                                    height="x2"
                                                    className={shimmerClass}
                                                    rounded="xs"
                                                />
                                                <Stack
                                                    height="x2"
                                                    className={shimmerClass}
                                                    rounded="xs"
                                                />
                                                <Stack
                                                    height="x2"
                                                    className={shimmerClass}
                                                    rounded="xs"
                                                />
                                                <Stack
                                                    height="x2"
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
                </Stack>
                <Stack grow bottom left padding="lg" position="absolute" width="100%">
                    <Box grow className={shimmerClass} height="x6" rounded="sm" />
                </Stack>
            </Stack>
            {props.children}
        </Box>
    )
}
