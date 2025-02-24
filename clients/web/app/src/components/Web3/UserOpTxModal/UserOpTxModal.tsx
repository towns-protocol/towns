import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import React, { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'

import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useDevice } from 'hooks/useDevice'
import { env } from 'utils'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { StandardUseropTx } from './StandardUseropTx'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'
import { ErrorContent, UserOpTxModal as UserOpTxModalV2 } from './v2/UserOpTxModal'

export function UserOpTxModal() {
    return env.VITE_ENABLE_CONFIRM_V2 ? <UserOpTxModalV2 /> : <UserOpTxModalV1 />
}

export function UserOpTxModalV1() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const { promptUser, setPromptResponse } = userOpsStore(
        useShallow((s) => ({
            promptUser: selectUserOpsByAddress(myAbstractAccountAddress, s)?.promptUser,
            setPromptResponse: s.setPromptResponse,
        })),
    )
    const deny = () => setPromptResponse(myAbstractAccountAddress, 'deny')

    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { isTouch } = useDevice()
    const [disableUiWhileCrossmintPaymentPhase, setDisableUiWhileCrossmintPaymentPhase] =
        useState(false)
    const onHide = () => {
        // prevent close while crossmint payment is in progress
        if (disableUiWhileCrossmintPaymentPhase) {
            return
        }
        endPublicPageLoginFlow()
        deny?.()
    }
    if (!promptUser) {
        return null
    }
    return (
        <AboveAppProgressModalContainer
            asSheet={isTouch}
            minWidth="auto"
            background={isTouch ? undefined : 'none'}
            onHide={onHide}
        >
            <ErrorBoundary
                FallbackComponent={({ error }) => (
                    <ErrorContent
                        containerName="UserOpTxModal"
                        error={error}
                        message="There was an error with your transaction. Please log a bug report."
                        onHide={onHide}
                    />
                )}
            >
                <StandardUseropTx
                    disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                    setDisableUiWhileCrossmintPaymentPhase={setDisableUiWhileCrossmintPaymentPhase}
                />
            </ErrorBoundary>
        </AboveAppProgressModalContainer>
    )
}
