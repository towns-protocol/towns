import React from 'react'
import { Box, BoxProps, Stack } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'

export const DirectMessageItemSkeleton = (props: Omit<BoxProps, 'children'>) => {
    return (
        <Stack grow paddingX="md" paddingY="xxs" {...props}>
            <Stack horizontal alignItems="center" gap="sm" height="height_lg">
                <Box
                    height="x4"
                    aspectRatio="1/1"
                    background="level2"
                    rounded="full"
                    className={shimmerClass}
                />
                <Box grow background="level2" rounded="xs" height="x2" className={shimmerClass} />
            </Stack>
        </Stack>
    )
}
