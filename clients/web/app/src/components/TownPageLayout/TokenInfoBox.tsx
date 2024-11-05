import React, { useMemo, useState } from 'react'
import { Box } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { Entitlements } from 'hooks/useEntitlements'
import { RequirementsModal } from '@components/Modals/RequirementsModal'
import { InformationBox } from './InformationBox'
import { EntitlementsDisplay } from './EntitlementsDisplay'

export const TokenInfoBox = ({
    spaceId,
    entitlements,
    onInfoBoxClick,
    hasError,
    title,
    subtitle,
    isEntitlementsLoading,
    dataTestId,
}: {
    spaceId: string | undefined
    entitlements: Entitlements
    isEntitlementsLoading?: boolean
    onInfoBoxClick?: () => void
    title: string
    subtitle: string
    hasError?: boolean
    dataTestId?: string
}) => {
    const [showModal, setShowModal] = useState(false)

    const isAccessOpen = useMemo(
        () =>
            entitlements.users.length === 0 &&
            entitlements.tokens.length === 0 &&
            entitlements.ethBalance.length > 0,
        [entitlements.users.length, entitlements.tokens.length, entitlements.ethBalance],
    )

    const notClickable = useMemo(
        () => spaceId !== undefined && (!isAccessOpen || isEntitlementsLoading),
        [spaceId, isAccessOpen, isEntitlementsLoading],
    )

    const handleClick = () => {
        if (notClickable) {
            return
        }
        if (onInfoBoxClick) {
            onInfoBoxClick()
        } else {
            setShowModal(true)
        }
    }

    return (
        <Box pointerEvents={notClickable ? 'none' : 'auto'}>
            <InformationBox
                border={hasError ? 'negative' : 'none'}
                title={title}
                subtitle={subtitle}
                dataTestId={dataTestId}
                centerContent={
                    isEntitlementsLoading ? (
                        <ButtonSpinner height="x1" />
                    ) : (
                        <EntitlementsDisplay isCentered entitlements={entitlements} />
                    )
                }
                onClick={handleClick}
            />
            {showModal && (
                <RequirementsModal
                    spaceId={spaceId}
                    title={title}
                    entitlements={entitlements}
                    onClose={() => setShowModal(false)}
                />
            )}
        </Box>
    )
}
