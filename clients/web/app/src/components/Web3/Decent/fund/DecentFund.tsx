import React, { useState } from 'react'
import { BoxHooksContextProvider } from '@decent.xyz/box-hooks'
import { ClientRendered } from '@decent.xyz/box-ui'
import { AnimatePresence } from 'framer-motion'
import { env } from 'utils'
import { FormRender } from 'ui/components/Form/Form'
import { Box, Stack } from '@ui'
import { FullPanelOverlay } from '@components/Web3/WalletLinkingPanel'
import { ChainSelector } from '@components/Web3/Decent/fund/ChainSelector'
import { FundProvider, useFundContext } from './FundContext'
import { ActionButton } from './ActionButton'
import { Fees } from './Fees'
import { Sending } from './Sending'
import { Receiving } from './Receiving'
import { tokenAmountSchema } from './formSchema'
import { FundWalletCallbacks } from './types'

export function DecentFund(props: FundWalletCallbacks = {}) {
    const apiKey = env.VITE_DECENT_API_KEY
    const [showChainSelector, setShowChainSelector] = useState(false)

    if (!apiKey) {
        return null
    }

    return (
        <BoxHooksContextProvider apiKey={apiKey}>
            <FundProvider>
                <ClientRendered>
                    <PreventClose>
                        <FormRender schema={tokenAmountSchema} id="TransferAssets" mode="onChange">
                            {() => (
                                <Stack gap="sm">
                                    <Sending setShowChainSelector={setShowChainSelector} />
                                    <Receiving />
                                    <Fees />
                                    <ActionButton
                                        onTxStart={props.onTxStart}
                                        onTxSuccess={props.onTxSuccess}
                                        onTxError={props.onTxError}
                                        onConnectWallet={props.onConnectWallet}
                                    />
                                </Stack>
                            )}
                        </FormRender>

                        <AnimatePresence>
                            {showChainSelector && (
                                <ChainSelector setShowChainSelector={setShowChainSelector} />
                            )}
                        </AnimatePresence>
                    </PreventClose>
                </ClientRendered>
            </FundProvider>
        </BoxHooksContextProvider>
    )
}

function PreventClose(props: { children: React.ReactNode }) {
    const { children } = props
    const { tx } = useFundContext()
    return (
        <>
            {tx.status === 'pending' && <Box position="fixedCenter" height="100vh" width="100vw" />}
            {children}
            {tx.status === 'pending' && <FullPanelOverlay text="Waiting for transaction..." />}
        </>
    )
}
