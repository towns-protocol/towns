import React from 'react'
import { Box, Stack } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'

export const ChannelsShimmer = () => {
    return (
        <Stack gap="md" padding="md" data-testid="channel-shimmer">
            {Array(6)
                .fill(undefined)
                .map((_, i) => i)
                .map((k, _, a) => {
                    return (
                        <Stack gap key={`${k}`} style={{ opacity: 1 - (1 / a.length) * k }}>
                            <Stack horizontal gap>
                                <Box
                                    square="square_lg"
                                    aspectRatio="1/1"
                                    rounded="sm"
                                    className={shimmerClass}
                                />
                                <Stack grow gap="md">
                                    <Stack grow className={shimmerClass} rounded="xs" />
                                </Stack>
                            </Stack>
                        </Stack>
                    )
                })}
        </Stack>
    )
}
