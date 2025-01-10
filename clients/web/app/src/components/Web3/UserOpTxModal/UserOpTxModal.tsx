import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import React, { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'

import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useDevice } from 'hooks/useDevice'
import { StandardUseropTx } from './StandardUseropTx'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'

export function UserOpTxModal() {
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
    if (!promptUser) {
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
