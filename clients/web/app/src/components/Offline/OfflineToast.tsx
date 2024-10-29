import React, { useEffect } from 'react'
import { useNetworkStatus } from 'use-towns-client'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast, dismissToast } from '@components/Notifications/StandardToast'

export function useOfflineToast() {
    const { isOffline } = useNetworkStatus()

    useEffect(() => {
        let toastId: string | undefined
        if (isOffline) {
            toastId = popupToast(
                ({ toast }) => (
                    <StandardToast
                        icon="satelite"
                        iconProps={{
                            style: {
                                '--dot-color': '#F2693E',
                            } as React.CSSProperties,
                        }}
                        toast={toast}
                        message="Please check your connection"
                        subMessage="Looks like you may be offline. Please check your connection and try again."
                    />
                ),
                {
                    duration: Infinity,
                },
            )
        }
        return () => {
            if (toastId) {
                dismissToast(toastId)
            }
        }
    }, [isOffline])
}
