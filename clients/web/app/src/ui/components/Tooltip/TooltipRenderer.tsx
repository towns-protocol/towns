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
} as const

export type TooltipOptions = {
    placement?: 'vertical' | 'horizontal'
    align?: 'start' | 'center' | 'end'
    trigger?: (typeof Trigger)[keyof typeof Trigger]
    active?: boolean
    immediate?: boolean
    closeHandleRef?: MutableRefObject<undefined | (() => void)>
    alignRef?: RefObject<HTMLElement>
}

type Props = TooltipOptions & {
    children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode
    tooltip: React.ReactNode | undefined
}

type TriggerProps = {
    ref: RefObject<HTMLElement>
    onMouseEnter: () => void
    onMouseLeave: () => void
}

export const TooltipContext = createContext<{
    placement: 'vertical' | 'horizontal'
}>({ placement: 'vertical' })

export const TooltipRenderer = (props: Props) => {
    const {
        immediate,
        align = 'center',
        active: forceActive = false,
        children,
        placement = 'vertical',
        tooltip: render,
        closeHandleRef,
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

    return !children ? null : (
        <>
            {children({
                triggerProps: {
                    ref: triggerRef,
                    onMouseEnter,
                    onMouseLeave,
                },
            })}

            {keepAlive &&
                root &&
                render &&
                createPortal(
                    <AnimatePresence>
                        {active ? (
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
