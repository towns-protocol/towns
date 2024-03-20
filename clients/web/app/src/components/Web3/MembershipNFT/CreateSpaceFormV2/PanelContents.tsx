import React from 'react'
import { Paragraph, Stack } from '@ui'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { Panel } from '@components/Panel/Panel'

type PanelContentProps = {
    onClick?: () => void
}

export function PanelContent({
    onClick,
    children,
}: PanelContentProps & { children: React.ReactNode }) {
    return (
        <Panel modalPresentable label="Edit Membership" onClose={onClick}>
            <Stack gap>
                <Paragraph strong>Who Can Join</Paragraph>
                <EditGating />

                <Paragraph strong>Pricing</Paragraph>
                <EditPricing />

                <Paragraph strong>Membership</Paragraph>
                <EditMembership />
                {children}
            </Stack>
        </Panel>
    )
}
