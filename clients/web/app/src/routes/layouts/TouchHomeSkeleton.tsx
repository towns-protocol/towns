import React from 'react'
import { Box, Stack } from '@ui'
import { shimmerClass, shimmerGradientTopClass } from 'ui/styles/globals/shimmer.css'

export const TouchHomeSkeleton = (props: { children?: React.ReactNode }) => (
    <Box
        grow
        absoluteFillSafeSafari
        data-testid="timeline-shimmer"
        paddingTop="safeAreaInsetBottom"
        background="level1"
    >
        <Stack
            grow
            justifyContent="end"
            position="relative"
            overflow="hidden"
            className={shimmerGradientTopClass}
        >
            <Stack
                gap="x4"
                position="bottomLeft"
                padding={{ touch: 'md', default: 'lg' }}
                width="100%"
            >
                {Array(8)
                    .fill(undefined)
                    .map((_, i) => i)
                    .map((k, _, a) => {
                        return (
                            <Stack gap key={`${k}`}>
                                <Stack horizontal gap>
                                    <Box
                                        width={{ touch: 'x4', default: 'x6' }}
                                        height={{ touch: 'x4', default: 'x6' }}
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

                                        {/* <Stack height="x2" className={shimmerClass} rounded="xs" /> */}
                                        {/* <Stack height="x2" className={shimmerClass} rounded="xs" /> */}
                                        <Stack />
                                        <Stack
                                            height="x8"
                                            width="100%"
                                            className={shimmerClass}
                                            rounded="xs"
                                        />
                                    </Stack>
                                </Stack>
                            </Stack>
                        )
                    })}{' '}
                <Stack grow width="100%" background="level1">
                    <Box grow className={shimmerClass} height="x6" rounded="sm" />
                </Stack>
            </Stack>
        </Stack>
        {props.children}
    </Box>
)
