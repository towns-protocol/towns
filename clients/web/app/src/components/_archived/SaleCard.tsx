import React from 'react'
import { BackgroundImage, Box, BoxProps, Card, Icon, Stack, Text } from '@ui'

type Props = {
    colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
    imageSrc: string
    floorPrice: number
    supply: number
    space: string
} & BoxProps

export const SaleCard = ({
    imageSrc,
    supply,
    space,
    floorPrice,
    colSpan = 4,
    ...boxProps
}: Props) => (
    <Card
        colSpan={{ tablet: 6, desktop: colSpan }}
        background={{ lightMode: 'default', darkMode: 'level3' }}
        aspectRatio="1/1"
        {...boxProps}
    >
        <Box grow>{imageSrc && <BackgroundImage src={imageSrc} />}</Box>
        <Stack gap="md" padding="md">
            <Text color="gray1">{space}</Text>
            <Text>{supply}</Text>
            <Stack horizontal>
                <Icon type="eth" size="square_inline" />
                {floorPrice}
            </Stack>
        </Stack>
    </Card>
)
