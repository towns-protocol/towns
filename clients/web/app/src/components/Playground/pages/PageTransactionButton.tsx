import React from 'react'
import { TransactionButtonExample } from '@components/TransactionButton/example/TransactionButtonExample'
import { Container } from '../components/PlaygroundContainer'

export const PageTransactionButton = () => {
    return (
        <>
            <Container grow label="Transaction Button" background="level2">
                <TransactionButtonExample />
            </Container>
        </>
    )
}
