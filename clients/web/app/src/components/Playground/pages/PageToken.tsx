import React from 'react'
import { TownsTokenExample } from '@components/TownsToken/example/TownTokenExample'
import { Container } from '../components/PlaygroundContainer'

export const PageToken = () => {
    return (
        <>
            <Container grow label="token" background="level2">
                <TownsTokenExample size="sm" />
            </Container>
            <Container grow label="token" background="level2">
                <TownsTokenExample size="lg" />
            </Container>
        </>
    )
}
