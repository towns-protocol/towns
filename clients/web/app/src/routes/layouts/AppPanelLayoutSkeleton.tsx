import { Allotment } from 'allotment'
import React from 'react'
import { SpaceSidebarLoadingPlaceholder } from '@components/SideBars/SpaceSideBar/SpaceSideBarLoading'
import { Box, Stack } from '@ui'
import { LogoSingleLetter } from '@components/Logo/Logo'
import { FadeInBox } from '@components/Transitions'

export const AppPanelLayoutSkeleton = () => {
    return (
        <Box absoluteFill padding="xs">
            <TopBarSkeleton />
            <Allotment>
                {/* left-side side-bar goes here */}
                <Allotment.Pane minSize={64 + 8} maxSize={64 + 8} preferredSize={65}>
                    <FadeInBox absoluteFill padding="xs" delay={0.1} preset="fadeup">
                        <Box elevateReadability grow rounded="sm" />
                    </FadeInBox>
                </Allotment.Pane>

                {/* channel side-bar goes here */}
                <Allotment.Pane visible minSize={180} maxSize={320} preferredSize={320}>
                    <FadeInBox absoluteFill padding="xs" delay={0.2} preset="fadeup">
                        <Box grow overflow="hidden" rounded="sm">
                            <SpaceSidebarLoadingPlaceholder />
                        </Box>
                    </FadeInBox>
                </Allotment.Pane>

                {/* main container */}
                <Allotment.Pane>
                    <FadeInBox absoluteFill padding="xs" delay={0.3} preset="fadeup">
                        <Box grow rounded="sm" overflow="hidden">
                            <Box background="level2" height="x6" />
                            <Box elevateReadability grow />
                        </Box>
                    </FadeInBox>
                </Allotment.Pane>
            </Allotment>
        </Box>
    )
}

const TopBarSkeleton = () => {
    return (
        <FadeInBox padding="xs">
            <Stack horizontal elevateReadability minHeight="x6" rounded="sm">
                <Box centerContent width="x8">
                    <a href="https://towns.com" rel=", noopener noreferrer" target="_blank">
                        <LogoSingleLetter />
                    </a>
                </Box>
                <Box centerContent grow padding="sm">
                    <Box background="level2" width="700" height="x4" rounded="sm" />
                </Box>
                <Box width="x5" />
            </Stack>
        </FadeInBox>
    )
}
