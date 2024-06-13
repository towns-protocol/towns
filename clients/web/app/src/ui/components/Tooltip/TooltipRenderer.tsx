import React, {
    MutableRefObject,
    RefObject,
    createContext,
    useEffect,
    useRef,
    useState,
} from 'react'

import { createPortal } from 'react-dom'
import { useEvent } from 'react-use-event-hook'
import { AnimatePresence } from 'framer-motion'
import { TooltipPositioner } from './TooltipPositioner'
import { useZLayerContext } from '../ZLayer/ZLayer'

const Trigger = {
    hover: 'hover',
    click: 'click',
} as const

export type TooltipOptions = {
    placement?: 'vertical' | 'horizontal'
    align?: 'start' | 'center' | 'end'
    trigger?: (typeof Trigger)[keyof typeof Trigger]
    active?: boolean
    immediate?: boolean
    removeOnClick?: boolean
    closeHandleRef?: MutableRefObject<undefined | (() => void)>
    alignRef?: RefObject<HTMLElement>
    disabled?: boolean
}

type Props = TooltipOptions & {
    children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode
    tooltip: React.ReactNode | undefined
}

export type HoverTriggerProps = {
    ref: RefObject<HTMLElement>
    onMouseEnter: () => void
    onMouseLeave: () => void
    onMouseUp?: () => void
}

export type ClickTriggerProps = {
    ref: RefObject<HTMLElement>
    onMouseUp?: () => void
}

export type TriggerProps = HoverTriggerProps | ClickTriggerProps

export const TooltipContext = createContext<{
    placement: 'vertical' | 'horizontal'
}>({ placement: 'vertical' })

export const TooltipRenderer = (props: Props) => {
    const {
        trigger = Trigger.hover,
        immediate = props.trigger === Trigger.click,
        align = 'center',
        active: forceActive = false,
        children,
        placement = 'vertical',
        tooltip: render,
        closeHandleRef,
        removeOnClick,
    } = props

    const triggerRef = useRef<HTMLElement | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const alignRef = props.alignRef ?? triggerRef
    const [active, setActive] = useState(forceActive)

    const onMouseEnter = useEvent(() => {
        setActive(true)
    })

    const onMouseLeave = useEvent(() => {
        if (!forceActive) {
            setActive(false)
        }
    })

    const onMouseClick = useEvent(() => {
        if (props.trigger === Trigger.click) {
            setActive((active) => !active)
        }
    })

    if (closeHandleRef) {
        closeHandleRef.current = () => {
            setActive(false)
        }
    }

    useEffect(() => {
        setActive(forceActive)
    }, [forceActive])

    const root = useZLayerContext().rootLayerRef?.current
    const [keepAlive, setKeepAlive] = useState(immediate ? true : false)

    useEffect(() => {
        const DELAY_BEFORE = 350
        const DELAY_AFTER = 500
        if (active) {
            const timeout = setTimeout(
                () => {
                    setKeepAlive(true)
                },
                immediate ? 0 : DELAY_BEFORE,
            )
            return () => {
                clearTimeout(timeout)
            }
        } else {
            const timeout = setTimeout(() => {
                setKeepAlive(false)
            }, DELAY_AFTER)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [active, immediate])

    return (
        <>
            {children &&
                children({
                    triggerProps: props.disabled
                        ? {
                              ref: triggerRef,
                          }
                        : trigger === Trigger.hover
                        ? {
                              ref: triggerRef,
                              onMouseEnter,
                              onMouseLeave,
                              onMouseUp: removeOnClick ? onMouseLeave : undefined,
                          }
                        : {
                              ref: triggerRef,
                              onMouseUp: onMouseClick,
                          },
                })}

            {keepAlive &&
                root &&
                render &&
                createPortal(
                    <AnimatePresence>
                        {active && !props.disabled ? (
                            <TooltipPositioner
                                align={align}
                                containerRef={containerRef}
                                render={render}
                                triggerRef={alignRef}
                                placement={placement}
                                onMouseLeave={onMouseLeave}
                            />
                        ) : null}
                    </AnimatePresence>,
                    root,
                )}
        </>
    )
}
