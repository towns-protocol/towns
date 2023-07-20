import React, { useCallback } from 'react'
import { useConnect } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { FancyButton } from 'ui/components/Button/FancyButton'
import { useEnvironment } from 'hooks/useEnvironmnet'

export const WalletConnectButton = () => {
    const { chainId } = useEnvironment()
    const { connect, connectors } = useConnect({
        chainId,
    })

    const walletConnect = connectors?.find((c) => c instanceof WalletConnectConnector)

    const buttonClicked = useCallback(() => {
        connect({ connector: walletConnect })
    }, [connect, walletConnect])

    return (
        <FancyButton cta disabled={!walletConnect?.ready} onClick={buttonClicked}>
            Connect Wallet
        </FancyButton>
    )
}
