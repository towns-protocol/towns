import React from 'react'
import { PrivyWalletReady, PrivyWalletReadyProps } from '@towns/privy'
import { TSigner } from 'use-towns-client'
import { Toast } from 'react-hot-toast/headless'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Box, Button, Icon, IconButton, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { StandardToast } from '@components/Notifications/StandardToast'
import { useCombinedAuth } from './useCombinedAuth'

export function WalletReady(props: Omit<PrivyWalletReadyProps, 'chainId'>) {
    const { baseChain } = useEnvironment()
    const {
        WaitForPrivy: WaitForPrivyOverride,
        WaitForWallets: WaitForWalletsOverride,
        LoginButton: LoginButtonOverride,
        children,
    } = props
    return (
        <PrivyWalletReady
            chainId={baseChain.id}
            WaitForPrivy={WaitForPrivyOverride ?? <SpinnerFallback />}
            WaitForWallets={WaitForWalletsOverride ?? <SpinnerFallback />}
            LoginButton={LoginButtonOverride ?? <LoginButton />}
        >
            {children}
        </PrivyWalletReady>
    )
}

function SpinnerFallback() {
    return (
        <Box horizontal centerContent gap="sm" background="level2" padding="md" rounded="sm">
            <ButtonSpinner />
        </Box>
    )
}

function LoginButton() {
    const { privyLogin } = useCombinedAuth()
    return (
        <Box tooltip="For your security, please click to re-authenticate with Privy." width="100%">
            <Button tone="negativeSubtle" onClick={privyLogin}>
                <Icon type="alert" size="square_inline" />
                <Text>Reauthenticate</Text>
            </Button>
        </Box>
    )
}

export type GetSigner = () => Promise<TSigner | undefined>

export function LoginToPrivyIconButton(props: { message?: string }) {
    const { privyLogin } = useCombinedAuth()
    return (
        <IconButton
            icon="alert"
            tooltip={
                props.message ??
                'For your security, performing this action requires you to re-authenticate with Privy.'
            }
            onClick={privyLogin}
        />
    )
}

export function ReauthenticateToast(props: { toast: Toast; message: string; cta: string }) {
    const { privyLogin } = useCombinedAuth()

    return (
        <StandardToast.Error
            toast={props.toast}
            message={props.message}
            cta={props.cta}
            onCtaClick={() => {
                privyLogin()
            }}
        />
    )
}
