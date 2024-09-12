import React from 'react'
import { Toast } from 'react-hot-toast/headless'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { StandardToast } from './StandardToast'

export const PrivyNotAuthenticatedNotification = ({ toast }: { toast: Toast }) => {
    const { privyLogin } = useCombinedAuth()

    return (
        <StandardToast.Error
            toast={toast}
            message="For your security, performing this action requires you to re-authenticate with Privy."
            cta="Re-authenticate"
            onCtaClick={() => {
                privyLogin()
            }}
        />
    )
}
