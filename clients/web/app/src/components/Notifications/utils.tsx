import React from 'react'
import { toast } from 'react-hot-toast/headless'
import { PrivyNotAuthenticatedNotification } from '@components/Notifications/PrivyNotAuthenticatedNotification'

export function createPrivyNotAuthenticatedNotification() {
    return toast.custom(
        (t) => {
            return <PrivyNotAuthenticatedNotification toast={t} />
        },
        {
            duration: Infinity,
        },
    )
}
