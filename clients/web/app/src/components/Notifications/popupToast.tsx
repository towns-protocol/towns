import React from 'react'
import { ToastOptions } from 'react-hot-toast'
import headlessToast, { Toast } from 'react-hot-toast/headless'

export function popupToast(
    ToastComponent: React.ElementType<{ toast: Toast }>,
    options?: ToastOptions,
) {
    return headlessToast.custom((t) => <ToastComponent toast={t} />, {
        ...options,
        duration: options?.duration ?? 8_000,
    })
}
