import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import React, { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { AboveAppProgressModalContainer } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'

import { usePublicPageLoginFlow } from 'routes/PublicTownPage/usePublicPageLoginFlow'
import { useDevice } from 'hooks/useDevice'
import { StandardUseropTx } from './StandardUseropTx'
import { useMyAbstractAccountAddress } from './hooks/useMyAbstractAccountAddress'
import { UserOpTxModalProvider } from './UserOpTxModalContext'

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
    const [disableModalActions, setDisableModalActions] = useState(false)
    if (!promptUser) {
        return null
    }
    return (
        <AboveAppProgressModalContainer
            asSheet={isTouch}
            minWidth="auto"
            padding="none"
            onHide={() => {
                // prevent close while crossmint payment is in progress
                if (disableModalActions) {
                    return
                }
                endPublicPageLoginFlow()
                deny?.()
            }}
        >
            <UserOpTxModalProvider>
                <StandardUseropTx
                    disableModalActions={disableModalActions}
                    setDisableModalActions={setDisableModalActions}
                />
            </UserOpTxModalProvider>
        </AboveAppProgressModalContainer>
    )
}
