import React from 'react'
import { PrivyNotAuthenticatedNotification } from '@components/Notifications/PrivyNotAuthenticatedNotification'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { popupToast } from './popupToast'

export function createPrivyNotAuthenticatedNotification() {
    return popupToast(({ toast }) => {
        return (
            <PrivyWrapper>
                <PrivyNotAuthenticatedNotification toast={toast} />
            </PrivyWrapper>
        )
    })
}
