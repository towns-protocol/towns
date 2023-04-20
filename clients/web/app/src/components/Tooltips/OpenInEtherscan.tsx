import React from 'react'
import { Card, Icon, Stack } from '@ui'

export const OpenInEtherscan = () => {
    return (
        <Card
            border
            centerContent
            paddingX="md"
            paddingY="paragraph"
            fontSize="md"
            rounded="sm"
            color="default"
        >
            <Stack centerContent horizontal gap="md">
                Open in Etherscan
                <Icon type="linkOut" size="square_sm" />
            </Stack>
        </Card>
    )
}
