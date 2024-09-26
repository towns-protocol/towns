import React, { useMemo } from 'react'
import { usePricingModules } from 'use-towns-client'
import { Paragraph, Stack } from '@ui'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { Panel } from '@components/Panel/Panel'
import { useDevice } from 'hooks/useDevice'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { EditPricingTitle } from '@components/Web3/EditMembership/EditPricingTitle'

type PanelContentProps = {
    onClosed: () => void
    freeAllocation: number | undefined
}

export function PanelContent({
    onClosed,
    children,
    freeAllocation,
}: PanelContentProps & { children: React.ReactNode }) {
    const isTouch = useDevice().isTouch
    const { data: pricingModules, isLoading: isLoadingPricingModules } = usePricingModules()
    const content = useMemo(() => {
        return (
            <Stack gap paddingY="xs">
                <Stack gap="paragraph">
                    <Paragraph strong>Who Can Join</Paragraph>
                    <EditGating />
                </Stack>
                <Stack gap="paragraph">
                    <EditPricingTitle />
                    <EditPricing
                        freeAllocation={freeAllocation}
                        pricingModules={pricingModules}
                        isLoadingPricingModules={isLoadingPricingModules}
                    />
                </Stack>
                <Stack gap="paragraph">
                    <Paragraph strong>Membership</Paragraph>
                    <EditMembership />
                </Stack>
                {children}
            </Stack>
        )
    }, [children, freeAllocation, isLoadingPricingModules, pricingModules])

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
