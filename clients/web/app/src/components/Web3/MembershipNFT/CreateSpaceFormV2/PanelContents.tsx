import React, { useMemo } from 'react'
import { Paragraph, Stack } from '@ui'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { Panel } from '@components/Panel/Panel'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'

type PanelContentProps = {
    onClosed: () => void
}

export function PanelContent({
    onClosed,
    children,
}: PanelContentProps & { children: React.ReactNode }) {
    const isTouch = useDevice().isTouch
    const content = useMemo(() => {
        return (
            <Stack gap>
                <Paragraph strong>Who Can Join</Paragraph>
                <EditGating />

                <Paragraph strong>Pricing</Paragraph>
                <EditPricing />

                <Paragraph strong>Membership</Paragraph>
                <EditMembership />
                {children}
            </Stack>
        )
    }, [children])

    if (isTouch) {
        return (
            <ModalContainer asSheet onHide={onClosed}>
                {content}
            </ModalContainer>
        )
    }

    return (
        <Panel modalPresentable label="Edit Membership" onClosed={onClosed}>
            {content}
        </Panel>
    )
}
