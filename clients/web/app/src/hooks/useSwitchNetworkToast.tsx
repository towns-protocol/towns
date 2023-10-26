import React, { useEffect } from 'react'

import headlessToast, { Toast, toast } from 'react-hot-toast/headless'
import { Box, Icon } from '@ui'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { useRequireTransactionNetwork } from './useRequireTransactionNetwork'

type Props = {
    cta?: string
    postCta?: string
}

export function useSwitchNetworkToast(props: Props) {
    const { isTransactionNetwork, isReady } = useRequireTransactionNetwork()
    const [isVisible, setIsVisible] = React.useState(false)

    useEffect(() => {
        let toastId: string | undefined
        const dismissToast = () => {
            if (toastId) {
                headlessToast.dismiss(toastId)
            }
        }
        if (!isReady) {
            dismissToast()
            return
        }
        if (!isTransactionNetwork) {
            setIsVisible(true)
            toastId = toast.custom(
                (t) => {
                    return <SwitchNetworkToast toast={t} {...props} />
                },
                {
                    duration: Infinity,
                },
            )
        } else {
            setIsVisible(false)
            dismissToast()
        }

        return () => {
            setIsVisible(false)
            dismissToast()
        }
    }, [props, isTransactionNetwork, isReady])

    return isVisible
}

export const SwitchNetworkToast = ({
    toast,
    cta,
    postCta,
}: {
    toast: Toast
} & Props) => {
    const { switchNetwork } = useRequireTransactionNetwork()

    return (
        <>
            <Box horizontal gap centerContent width="300">
                <Icon color="error" type="alert" />
                <Box gap alignItems="end">
                    <RequireTransactionNetworkMessage
                        switchNetwork={switchNetwork}
                        cta={cta}
                        postCta={postCta}
                    />
                </Box>
            </Box>
        </>
    )
}
