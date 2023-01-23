import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { FadeIn } from '@components/Transitions'
import { Button } from '@ui'
import { Icon, IconName } from 'ui/components/Icon'
import { vars } from 'ui/styles/vars.css'
import { ButtonSpinner } from './Spinner/ButtonSpinner'

export const LoginButton = (props: {
    label: string
    loading?: boolean
    icon?: IconName
    onClick: () => void
    tone?: keyof typeof vars.color.background
}) => {
    const hasSpinner = useDeferredLoading(props.loading)

    return (
        <AnimatePresence mode="wait">
            <Button minWidth="250" tone={props.tone} onClick={props.onClick}>
                {props.icon && (
                    <FadeIn layout key="metamaks">
                        <Icon type="metamask" />
                    </FadeIn>
                )}

                <FadeIn layout key={props.label}>
                    {props.label}
                </FadeIn>
                {hasSpinner && (
                    <FadeIn delay>
                        <ButtonSpinner />
                    </FadeIn>
                )}
            </Button>
        </AnimatePresence>
    )
}

/**
 * to prevent gliches avoid showing spinner immediatly,
 * however avoid deferring when hiding
 **/
const useDeferredLoading = (isLoading?: boolean) => {
    const [deferredLoading, setDeferredLoading] = useState(isLoading)
    useEffect(() => {
        if (isLoading) {
            const timeout = setTimeout(() => {
                setDeferredLoading(true)
            }, 160)
            return () => {
                clearTimeout(timeout)
            }
        } else {
            setDeferredLoading(false)
        }
    }, [isLoading])

    return deferredLoading
}
