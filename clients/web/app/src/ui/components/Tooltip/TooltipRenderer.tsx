import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useEvent from 'react-use-event-hook'
import { RootLayerContext } from './OverlayPortal'
import { Placement } from './TooltipConstants'
import { TooltipOffsetContainer } from './TooltipOffsetContainer'

const Trigger = {
    hover: 'hover',
    click: 'click',
    contextmenu: 'contextmenu',
} as const

type Props = {
    layoutId?: string
    placement?: Placement
    children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode
    render: JSX.Element | undefined
    trigger?: typeof Trigger[keyof typeof Trigger]
}

type TriggerProps = {
    ref: (ref: HTMLElement | null) => void
    onClick?: (e: React.MouseEvent) => void
    onKeyDown?: (e: React.KeyboardEvent) => void
    onContextMenu?: (e: React.MouseEvent) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
    tabIndex?: number
    cursor: 'pointer'
}

// keeping this for further refactoring
const KEEP_OPEN_ON_CLICK_INSIDE = false

export const TooltipContext = createContext<{
    placement: Placement
}>({ placement: 'vertical' })

export const TooltipRenderer = (props: Props) => {
    const {
        layoutId = 'tooltip',
        trigger = Trigger.hover,
        children,
        placement = 'vertical',
        render,
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    const [triggerRect, setTriggerRect] = useState<DOMRect>()
    const [hitPosition, setHitPosition] = useState<[number, number]>()
    const [active, setActive] = useState(false)
    const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null)

    const onMouseEnter = useEvent(() => {
        if (!triggerRef) {
            return
        }
        const domRect = triggerRef.getBoundingClientRect()
        setTriggerRect(domRect)
        if (trigger === Trigger.hover) {
            setActive(true)
        }
    })

    const updateCoordsFromEvent = useEvent((e: React.MouseEvent) => {
        if (triggerRef) {
            setHitPosition([e.clientX, +e.clientY])
            const domRect = triggerRef.getBoundingClientRect()
            setTriggerRect(domRect)
        }
    })

    const onContextMenu = useEvent((e: React.MouseEvent) => {
        if (triggerRef && trigger === Trigger.contextmenu) {
            e.preventDefault()
            updateCoordsFromEvent(e)

            setActive(true)
        }
    })

    // handles cancelling of tooltip
    useEffect(() => {
        if (!active) {
            return
        }

        const onGlobalClick = (e: MouseEvent) => {
            if (trigger === 'contextmenu') {
                // prevents system context to popup when cancelling
                e.preventDefault()
            }

            const overlayContainer = containerRef.current

            const clickedNode = e.target as Node

            const isClickOutside =
                overlayContainer && clickedNode && !overlayContainer.contains(clickedNode)

            if (KEEP_OPEN_ON_CLICK_INSIDE) {
                // in some cases you might want to keep the popup open even when
                // clicking inside - there's no such case at the moment but could
                // become handy
                if (isClickOutside) {
                    setActive(false)
                }
            } else {
                setActive(false)
            }
        }

        // if we add the handled to current callstack the listener gets called
        // immediately which is not the intention
        setTimeout(() => {
            window.addEventListener('click', onGlobalClick)
            window.addEventListener('contextmenu', onGlobalClick)
        })

        return () => {
            window.removeEventListener('click', onGlobalClick)
            window.removeEventListener('contextmenu', onGlobalClick)
        }
    }, [active, trigger])

    const onClick = useCallback(
        (e: React.MouseEvent) => {
            if (trigger === Trigger.click) {
                e.preventDefault()
                setActive(true)
            }
        },
        [trigger],
    )

    useEffect(() => {
        if (!triggerRef) {
            return
        }
        const domRect = triggerRef.getBoundingClientRect()
        setTriggerRect(domRect)
    }, [triggerRef])

    const onMouseLeave = useCallback(() => {
        if (trigger === Trigger.hover) {
            setActive(false)
        }
    }, [trigger])

    useEffect(() => {
        const onBlur = () => {
            // setActive(false);
        }
        window.addEventListener('scroll', onBlur)
        window.addEventListener('blur', onBlur)
        return () => {
            window.removeEventListener('scroll', onBlur)
            window.removeEventListener('blur', onBlur)
        }
    }, [active])

    const root = useContext(RootLayerContext).rootLayerRef?.current

    const distance = placement === 'pointer' ? 'none' : undefined

    return !children ? null : (
        <TooltipContext.Provider value={{ placement }}>
            {children({
                triggerProps: {
                    ref: setTriggerRef,
                    onMouseEnter,
                    onClick: trigger === Trigger.click ? onClick : undefined,
                    onMouseLeave,
                    onContextMenu: trigger === Trigger.contextmenu ? onContextMenu : undefined,
                    cursor: 'pointer',
                },
            })}

            {active &&
                triggerRect &&
                root &&
                render &&
                createPortal(
                    <TooltipOffsetContainer
                        disableBackgroundInteraction={trigger !== 'hover'}
                        distance={distance}
                        layoutId={layoutId}
                        containerRef={containerRef}
                        render={render}
                        triggerRect={triggerRect}
                        hitPosition={hitPosition}
                        placement={placement}
                        onMouseLeave={onMouseLeave}
                    />,
                    root,
                )}
        </TooltipContext.Provider>
    )
}
