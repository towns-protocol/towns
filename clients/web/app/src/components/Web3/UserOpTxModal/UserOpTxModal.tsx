import { userOpsStore } from '@towns/userops'
import React, { useState } from 'react'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'

import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useDevice } from 'hooks/useDevice'
import { StandardUseropTx } from './StandardUseropTx'

export function UserOpTxModal() {
    const { currOp, confirm, deny } = userOpsStore()
    const { end: endPublicPageLoginFlow } = usePublicPageLoginFlow()
    const { isTouch } = useDevice()
    const [disableUiWhileCrossmintPaymentPhase, setDisableUiWhileCrossmintPaymentPhase] =
        useState(false)

    if (typeof confirm !== 'function' || !currOp) {
        return null
    }
    return (
        <AboveAppProgressModalContainer
            asSheet={isTouch}
            minWidth="auto"
            background={isTouch ? undefined : 'none'}
            onHide={() => {
                // prevent close while crossmint payment is in progress
                if (disableUiWhileCrossmintPaymentPhase) {
                    return
                }
                endPublicPageLoginFlow()
                deny?.()
            }}
        >
            <StandardUseropTx
                disableUiWhileCrossmintPaymentPhase={disableUiWhileCrossmintPaymentPhase}
                setDisableUiWhileCrossmintPaymentPhase={setDisableUiWhileCrossmintPaymentPhase}
            />
        </AboveAppProgressModalContainer>
    )
}
