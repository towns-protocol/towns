import React, { useCallback, useMemo } from 'react'
import { IconButton, Paragraph, Stack, Text } from '@ui'
import { EditPricing } from '@components/Web3/EditMembership/EditPricing'
import { EditMembership } from '@components/Web3/EditMembership/EditMembership'
import { EditGating } from '@components/Web3/EditMembership/EditGating'
import { PanelContentProps, PanelType } from './types'

export function PanelContent({ onClick, panelType }: PanelContentProps) {
    const title = useMemo(() => {
        switch (panelType) {
            case PanelType.all:
                return 'Edit Membership'
            default:
                return ''
        }
    }, [panelType])

    const renderContent = useCallback(() => {
        switch (panelType) {
            case PanelType.all:
                return <AllContent />
            default:
                return ''
        }
    }, [panelType])

    return (
        <Stack>
            <Stack
                horizontal
                justifyContent="spaceBetween"
                alignItems="center"
                height="x8"
                background="level2"
                padding="lg"
                borderBottom="level3"
            >
                <Text color="gray2">{title}</Text>
                <IconButton icon="close" color="default" onClick={onClick} />
            </Stack>
            <Stack padding="lg">{renderContent()}</Stack>
        </Stack>
    )
}

function AllContent() {
    return (
        <Stack gap>
            <Paragraph strong size="lg">
                Who Can Join
            </Paragraph>
            <EditGating />

            <Paragraph strong size="lg">
                Pricing
            </Paragraph>
            <EditPricing />

            <Paragraph strong size="lg">
                Membership
            </Paragraph>
            <EditMembership />
        </Stack>
    )
}
