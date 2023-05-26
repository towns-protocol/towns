import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useState } from 'react'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { Button } from '@ui'
import { Icon, IconName } from 'ui/components/Icon'
import { vars } from 'ui/styles/vars.css'
import { useDebounce } from 'hooks/useDebounce'
import { ButtonSpinner } from './Spinner/ButtonSpinner'

export const LoginButton = (props: {
    label: string
    loading?: boolean
    icon?: IconName
    onClick: () => void
    tone?: keyof typeof vars.color.background
    userOnWrongNetworkForSignIn: boolean
    isConnected: boolean
}) => {
    const hasSpinner = useDeferredLoading(props.loading)
    const isDisabled = hasSpinner || (props.isConnected && props.userOnWrongNetworkForSignIn)

    const label = useDebounce(props.label, 300)

    return (
        <AnimatePresence mode="popLayout">
            <Button
                animate
                disabled={isDisabled}
                // minWidth="200"
                tone={hasSpinner ? 'level3' : 'cta1'}
                onClick={props.onClick}
            >
                {hasSpinner && (
                    <IconContainer key="spinner">
                        <ButtonSpinner />
                    </IconContainer>
                )}

                {!hasSpinner && props.icon && (
                    <IconContainer key="wallet">
                        <Icon type="wallet" />
                    </IconContainer>
                )}

                <FadeIn delay layout="position" key={label}>
                    {label}
                </FadeIn>
            </Button>
        </AnimatePresence>
    )
}

const IconContainer = (props: { children: React.ReactNode }) => (
    <FadeInBox centerContent key="spinner" square="square_md" layout="position">
        {props.children}
    </FadeInBox>
)

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
