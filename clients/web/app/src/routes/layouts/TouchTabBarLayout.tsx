import React, { useMemo, useRef } from 'react'
import { Box } from '@ui'
import { PotentiallyUnusedSuspenseLoader } from '@components/Loaders/SuspenseLoader'
import { TouchTabBar } from '@components/TouchTabBar/TouchTabBar'
import { useVisualViewportContext } from '@components/VisualViewportContext/VisualViewportContext'

export const TouchTabBarLayout = (props: { children: React.ReactNode }) => {
    const { visualViewportScrolled: tabBarHidden } = useVisualViewportContext()
    const tabbarRef = useRef<HTMLDivElement>(null)
    const tabbarHeight = tabbarRef.current?.clientHeight ?? 56

    const style = useMemo(
        () =>
            ({
                [`--tabbar-vertical-offset`]: `${tabBarHidden ? tabbarHeight : 0}px`,
                transition: `transform ${tabBarHidden ? `50ms ease-in` : `120ms ease-out`}`,
                transform: `translateY(${tabBarHidden ? tabbarHeight : 0}px)`,
            } as React.CSSProperties),
        [tabBarHidden, tabbarHeight],
    )

    return (
        <Box grow style={style}>
            {/* stretch main container to push footer down */}
            <Box grow position="relative" overflowX="hidden">
                <PotentiallyUnusedSuspenseLoader>{props.children}</PotentiallyUnusedSuspenseLoader>
            </Box>
            {/* bottom content */}
            <Box ref={tabbarRef}>
                <TouchTabBar />
            </Box>
        </Box>
    )
}
