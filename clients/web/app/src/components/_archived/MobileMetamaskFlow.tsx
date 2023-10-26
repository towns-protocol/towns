import React, { useState } from 'react'
import { FancyButton } from '@ui'
import {
    Props as RequireTransactionModalProps,
    RequireTransactionNetworkModal,
} from '../Login/RequireTransactionNetworkModal'

export const MobileMetaMaskFlow = (
    props: {
        buttonLabel: string
        userOnWrongNetworkForSignIn: boolean
    } & Omit<RequireTransactionModalProps, 'onHide'>,
) => {
    const [showMetaMaskWarning, setShowMetaMaskWarning] = useState(false)
    const { buttonLabel, ...modalProps } = props

    return (
        <>
            <FancyButton cta icon="wallet" onClick={() => setShowMetaMaskWarning(true)}>
                {buttonLabel}
            </FancyButton>

            {showMetaMaskWarning && (
                <RequireTransactionNetworkModal
                    {...modalProps}
                    onHide={() => setShowMetaMaskWarning(false)}
                />
            )}
        </>
    )
}
