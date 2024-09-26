import React from 'react'
import { Paragraph, Stack } from '@ui'

const PRICING_LEARN_MORE =
    'https://herenottherelabs.notion.site/All-About-Pricing-2edea6a280cb46279762d9dca2b7be41'

export const EditPricingTitle = () => {
    return (
        <Stack horizontal gap="md" justifyContent="spaceBetween" alignItems="end">
            <Paragraph strong>Pricing</Paragraph>
            <Paragraph size="sm" color="cta2">
                <a href={PRICING_LEARN_MORE} rel="noopener noreferrer" target="_blank">
                    Learn more
                </a>
            </Paragraph>
        </Stack>
    )
}
