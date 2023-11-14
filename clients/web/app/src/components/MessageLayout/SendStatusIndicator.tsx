import React, { useEffect, useState } from 'react'
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
    const [isShowing, setIsShowing] = useState(true)

    const step = status.isEncrypting
        ? Step.Encrypting
        : status.isLocalPending
        ? Step.LocalPending
        : Step.Sent

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

    return (
        <MotionBox
            horizontal
            position="bottomRight"
            animate={{
                opacity: isShowing ? 1 : 0,
            }}
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
