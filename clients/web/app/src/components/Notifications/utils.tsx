import React from 'react'
import { toast } from 'react-hot-toast/headless'
import { PrivyNotAuthenticatedNotification } from '@components/Notifications/PrivyNotAuthenticatedNotification'
import { PrivyWrapper } from 'privy/PrivyProvider'

export function createPrivyNotAuthenticatedNotification() {
    return toast.custom(
        (t) => {
            return (
                <PrivyWrapper>
                    <PrivyNotAuthenticatedNotification toast={t} />
                </PrivyWrapper>
            )
        },
        {
            duration: Infinity,
        },
    )
}
