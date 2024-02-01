import React, { useEffect } from 'react'
import headlessToast, { toast } from 'react-hot-toast/headless'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'

export function useErrorToast({
    errorMessage,
    contextMessage,
}: {
    errorMessage: string | undefined
    contextMessage?: string
}) {
    useEffect(() => {
        let toastId: string | undefined
        const dismissToast = () => {
            if (toastId) {
                headlessToast.dismiss(toastId)
            }
        }

        console.error({
            errorMessage,
            contextMessage,
        })

        if (errorMessage) {
            toastId = toast.custom(
                (t) => {
                    return (
                        <ErrorNotification
                            toast={t}
                            errorMessage={errorMessage}
                            contextMessage={contextMessage}
                        />
                    )
                },
                {
                    duration: Infinity,
                },
            )
        } else {
            dismissToast()
        }

        return () => {
            dismissToast()
        }
    }, [errorMessage, contextMessage])
}
