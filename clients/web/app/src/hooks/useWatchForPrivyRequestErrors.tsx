import React, { useEffect, useRef } from 'react'
import headlessToast, { toast } from 'react-hot-toast/headless'
import { MessageTypes, bcChannelFactory } from 'workers/bcChannelFactory'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'

export function useWatchForPrivyRequestErrors() {
    const toastId = useRef<string | undefined>(undefined)
    useEffect(() => {
        const broadcast = bcChannelFactory('PRIVY_FAILURE')

        broadcast.onmessage = (event: { data: MessageTypes['PRIVY_FAILURE'] }) => {
            const errorMessage =
                event.data.type === 'PRIVY_LATENCY'
                    ? 'Requests are taking a long time'
                    : 'Request failed'

            if (toastId.current) {
                headlessToast.dismiss(toastId.current)
            }

            toastId.current = toast.custom((t) => (
                <ErrorNotification
                    toast={t}
                    errorMessage="There was an issue connecting with Privy"
                    contextMessage={errorMessage}
                />
            ))
        }
        return () => {
            broadcast.close()
        }
    })
}
