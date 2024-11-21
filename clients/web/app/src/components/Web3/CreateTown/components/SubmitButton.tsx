import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { FancyButton } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { CreateTownFormSchema } from '../types'

export const SubmitButton = (props: {
    form: UseFormReturn<CreateTownFormSchema>
    onSubmit: (getSigner: GetSigner) => void
    isSubmitting: boolean
    error: Error | undefined
}) => {
    const { form, onSubmit } = props

    const { isValid } = form.formState

    return isValid ? (
        <WalletReady>
            {({ getSigner }) => (
                <FancyButton
                    cta
                    data-testid="create-town-button"
                    borderRadius="lg"
                    onClick={() => {
                        onSubmit(getSigner)
                    }}
                >
                    Create Town
                </FancyButton>
            )}
        </WalletReady>
    ) : null
}
