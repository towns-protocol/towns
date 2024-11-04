import React from 'react'
import { PrivyNotAuthenticatedNotification } from '@components/Notifications/PrivyNotAuthenticatedNotification'

import { popupToast } from './popupToast'

export function createPrivyNotAuthenticatedNotification() {
    return popupToast(({ toast }) => {
        return <PrivyNotAuthenticatedNotification toast={toast} />
    })
}
