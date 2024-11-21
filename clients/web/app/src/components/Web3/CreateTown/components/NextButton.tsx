import React, { useCallback } from 'react'
import { FancyButton } from '@ui'
import { CreateTownFormReturn } from '../types'

export const NextButton = (props: {
    form: CreateTownFormReturn
    onNextSlide?: () => void
    onClickDisabled?: () => void
    disabled: boolean
}) => {
    const { form, disabled, onNextSlide, onClickDisabled } = props

    const onNextSlideClick = useCallback(() => {
        form.trigger()
        if (!disabled) {
            onNextSlide?.()
        }
    }, [onNextSlide, disabled, form])

    return (
        <FancyButton
            cta
            data-testid="next-button"
            type="button"
            borderRadius="lg"
            disabled={disabled}
            onClick={onNextSlideClick}
            onClickDisabled={onClickDisabled}
        >
            Next
        </FancyButton>
    )
}
