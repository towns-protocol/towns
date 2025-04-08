import React, { useEffect } from 'react'
import { useConnectivity } from 'use-towns-client'
import { Box, Grid, Heading, Stack } from '@ui'
import { useMobile } from 'hooks/useMobile'
import { env } from 'utils/environment'
import { Analytics } from 'hooks/useAnalytics'
import { Panel } from '@components/Panel/Panel'
import { ExploreCard } from './ExploreCard'
import { PublicExploreLayout } from './PublicExploreLayout'

const exploreTowns =
    env.VITE_EXPLORE_TOWNS?.split(',').map((townAddress) => townAddress.trim().toLowerCase()) ?? []

const bannedTowns =
    env.VITE_BANNED_TOWNS?.split(',').map((townAddress) => townAddress.trim().toLowerCase()) ?? []

const filteredExploreTowns = exploreTowns.filter(
    (townAddress) => !bannedTowns.includes(townAddress),
)

const ExplorePageContent = () => {
    console.log({ exploreTowns, bannedTowns, filteredExploreTowns })
    const isMobile = useMobile()
    const { isAuthenticated } = useConnectivity()

    useEffect(() => {
        Analytics.getInstance().page('home-page', 'explore page', {
            isLoggedIn: isAuthenticated,
        })
    }, [isAuthenticated])

    if (filteredExploreTowns.length === 0) {
        return <Box padding="x4">Cannot find any towns</Box>
    }

    const smallCardTowns = isMobile ? filteredExploreTowns : filteredExploreTowns.slice(2, 11)

    return (
        <Box padding={{ mobile: 'xs', desktop: 'lg' }} data-testid="explore-page">
            {!isMobile && (
                <Box marginBottom="lg">
                    <Heading level={3} color="default">
                        Explore Towns
                    </Heading>
                </Box>
            )}
            <Stack gap="lg">
                {!isMobile && (
                    <Grid autoFit columnMinSize="400px">
                        {filteredExploreTowns.slice(0, 2).map((town, index) => (
                            <ExploreCard key={town} address={town} variant="big" />
                        ))}
                    </Grid>
                )}

                <Grid columns={isMobile ? 1 : 3}>
                    {smallCardTowns.map((town) => (
                        <ExploreCard key={town} address={town} variant="small" />
                    ))}
                </Grid>
            </Stack>
        </Box>
    )
}

export const ExplorePage = () => {
    const { isAuthenticated } = useConnectivity()

    useEffect(() => {
        Analytics.getInstance().page('home-page', 'explore page', {
            isLoggedIn: isAuthenticated,
        })
    }, [isAuthenticated])

    if (!isAuthenticated) {
        return (
            <PublicExploreLayout>
                <ExplorePageContent />
            </PublicExploreLayout>
        )
    }

    return <ExplorePageContent />
}

export const ExploreMobile = () => {
    const { isAuthenticated } = useConnectivity()

    if (!isAuthenticated) {
        return (
            <PublicExploreLayout>
                <ExplorePageContent />
            </PublicExploreLayout>
        )
    }

    return (
        <Panel isRootPanel label="Explore Towns">
            <ExplorePageContent />
        </Panel>
    )
}
