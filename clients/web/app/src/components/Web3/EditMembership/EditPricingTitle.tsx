import React from 'react'
import { Paragraph, Stack } from '@ui'
import { PRICING_LEARN_MORE_LINK } from 'data/links'

export const EditPricingTitle = () => {
    return (
        <Stack horizontal gap="md" justifyContent="spaceBetween" alignItems="end">
            <Paragraph strong>Pricing</Paragraph>
            <Paragraph size="sm" color="cta2">
                <a href={PRICING_LEARN_MORE_LINK} rel="noopener noreferrer" target="_blank">
                    Learn more
                </a>
            </Paragraph>
        </Stack>
    )
}
