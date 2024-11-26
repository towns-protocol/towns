import React, { useCallback } from 'react'

import { Button, FancyButton, Paragraph } from '@ui'

import { WalletReady } from 'privy/WalletReady'
import { useCombinedAuth } from 'privy/useCombinedAuth'

import { CreateTownFormReturn } from '../types'

export const NextButton = (props: {
    form: CreateTownFormReturn
    onNextSlide?: () => void
    onClickDisabled?: () => void
    disabled: boolean
}) => {
    const { form, disabled, onNextSlide, onClickDisabled } = props

    const onNextSlideClick = useCallback(() => {
        form.trigger()
        if (!disabled) {
            onNextSlide?.()
        }
    }, [onNextSlide, disabled, form])

    return (
        <WalletReady
            WaitForWallets={<Fallback disabled={disabled}>Checking wallet...</Fallback>}
            WaitForPrivy={<Fallback disabled>Authenticating...</Fallback>}
            LoginButton={<ReauthenticateButton onClick={onClickDisabled} />}
        >
            {() => (
                <FancyButton
                    cta
                    data-testid="next-button"
                    type="button"
                    borderRadius="lg"
                    disabled={disabled}
                    onClick={onNextSlideClick}
                    onClickDisabled={onClickDisabled}
                >
                    Next
                </FancyButton>
            )}
        </WalletReady>
    )
}

const ReauthenticateButton = (props: { onClick?: () => void }) => {
    const { login } = useCombinedAuth()
    return (
        <Button tone="negativeSubtle" rounded="lg" icon="tryagain" size="button_md" onClick={login}>
            <Paragraph>Please reauthenticate</Paragraph>
        </Button>
    )
}

const Fallback = (props: { children: string; disabled?: boolean; onClick?: () => void }) => (
    <FancyButton
        disabled={props.disabled}
        data-testid="next-button"
        type="button"
        borderRadius="lg"
        onClick={props.onClick}
    >
        {props.children}
    </FancyButton>
)
