import React, { useEffect } from 'react'
import { useConnectivity } from 'use-towns-client'
import { Box, Heading, Stack } from '@ui'
import { useMobile } from 'hooks/useMobile'
import { env } from 'utils/environment'
import { Analytics } from 'hooks/useAnalytics'
import { ExploreCard } from './ExploreCard'

const exploreTowns =
    env.VITE_EXPLORE_TOWNS?.split(',').map((townAddress) => townAddress.trim()) ?? []

export const ExplorePage = () => {
    const isMobile = useMobile()
    const { isAuthenticated } = useConnectivity()

    useEffect(() => {
        Analytics.getInstance().page('home-page', 'explore page', {
            isLoggedIn: isAuthenticated,
        })
    }, [isAuthenticated])

    if (exploreTowns.length === 0) {
        return <Box padding="x4">Cannot find any towns</Box>
    }

    const smallCardTowns = isMobile ? exploreTowns : exploreTowns.slice(2, 11)

    return (
        <Box padding="x4">
            <Box marginBottom="lg">
                <Heading level={3} color="default">
                    Explore Towns
                </Heading>
            </Box>
            <Stack
                gap="lg"
                style={{
                    maxWidth: '1400px',
                }}
            >
                {!isMobile && (
                    <Box
                        display="grid"
                        gap="lg"
                        style={{
                            gridTemplateColumns: '1fr 1fr',
                        }}
                    >
                        {exploreTowns.slice(0, 2).map((town) => (
                            <ExploreCard key={town} address={town} variant="big" />
                        ))}
                    </Box>
                )}

                <Box
                    display="grid"
                    gap="md"
                    style={{
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        maxWidth: '1400px',
                    }}
                >
                    {smallCardTowns.map((town) => (
                        <ExploreCard key={town} address={town} variant="small" />
                    ))}
                </Box>
            </Stack>
        </Box>
    )
}
