import React, { useEffect, useMemo, useState } from 'react'
import { Icon, MotionBox } from '@ui'
import { SECOND_MS } from 'data/constants'

export type SendStatus = {
    isLocalPending: boolean
    isEncrypting: boolean
}

const Step = {
    Encrypting: 'Encrypting',
    LocalPending: 'LocalPending',
    Sent: 'Sent',
} as const

const StepColor = new Map([
    ['Encrypting', 'gray2'],
    ['LocalPending', 'error'],
    ['Sent', 'positive'],
] as const)

export const SendStatusIndicator = (props: { status: SendStatus }) => {
    const { status } = props

    const step = status.isEncrypting
        ? Step.Encrypting
        : status.isLocalPending
        ? Step.LocalPending
        : Step.Sent

    const [isShowing, setIsShowing] = useState(step !== Step.Sent)

    useEffect(() => {
        if (step === Step.Sent) {
            const timeout = setTimeout(() => {
                setIsShowing(false)
            }, SECOND_MS)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [step])

    const animated = useMemo(() => ({ opacity: isShowing ? 1 : 0 }), [isShowing])

    return (
        <MotionBox
            horizontal
            position="bottomRight"
            initial={animated}
            animate={animated}
            transition={{ duration: 1 }}
        >
            <Icon
                paddingTop="xxs"
                paddingLeft="xxs"
                type="check"
                size="square_xxs"
                color={StepColor.get(step)}
            />
        </MotionBox>
    )
}
