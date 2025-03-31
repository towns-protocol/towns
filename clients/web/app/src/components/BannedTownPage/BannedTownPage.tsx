import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Icon, Paragraph, Stack } from '@ui'
import { PATHS } from 'routes'

interface BannedTownPageProps {
    townAddress?: string
}

export const BannedTownPage: React.FC<BannedTownPageProps> = ({ townAddress }) => {
    const navigate = useNavigate()

    const handleExplore = () => {
        navigate(`/${PATHS.EXPLORE}`)
    }

    return (
        <Box
            centerContent
            height="100vh"
            background="level1"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
        >
            <Box background="level2" padding="x4" rounded="lg">
                <Stack alignItems="center" gap="lg">
                    <Icon type="alert" color="negative" size="square_lg" />
                    <Paragraph size="lg" textAlign="center" fontWeight="medium">
                        Banned Town
                    </Paragraph>
                    <Paragraph color="gray2" textAlign="center" maxWidth="400">
                        This town has been banned and is no longer accessible.
                    </Paragraph>
                    <Button tone="cta1" size="button_md" rounded="full" onClick={handleExplore}>
                        Explore Towns
                    </Button>
                </Stack>
            </Box>
        </Box>
    )
}
