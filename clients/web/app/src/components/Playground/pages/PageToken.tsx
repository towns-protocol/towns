import React from 'react'
import { InteractiveSpaceToken } from '@components/SpaceToken/InteractiveSpaceToken'
import { Box } from '@ui'
import { Container } from '../Playground'

export const PageToken = () => {
    return (
        <Container grow label="token">
            <Box centerContent background="level2">
                <InteractiveSpaceToken />
            </Box>
        </Container>
    )
}
