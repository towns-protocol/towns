import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useEvent from 'react-use-event-hook'
import { RootLayerContext } from '../Tooltip/OverlayPortal'
import { OverlayContainer } from './CardOverlayContainer'

export type Placement = 'above' | 'pointer'

const Trigger = {
    click: 'click',
    contextmenu: 'contextmenu',
} as const

type Props = {
    layoutId?: string
    placement?: Placement
    margin?: { x: number; y: number }
    children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode
    render: JSX.Element | undefined
    trigger?: typeof Trigger[keyof typeof Trigger]
}

type TriggerProps = {
    ref: (ref: HTMLElement | null) => void
    onClick?: (e: React.MouseEvent) => void
    onContextMenu?: (e: React.MouseEvent) => void
    tabIndex: 0
    cursor: 'pointer'
}

// keeping this for further refactoring
const KEEP_OPEN_ON_CLICK_INSIDE = true

export const CardOpenerContext = createContext<{
    placement: Placement
    closeCard?: () => void
}>({ placement: 'above' })

const createBounds = () => ({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
})

export const CardOpener = (props: Props) => {
    const { children, render, trigger = Trigger.click, placement = 'above' } = props

    const { rootLayerRef } = useContext(RootLayerContext)
    const root = rootLayerRef?.current ?? document.body

    const containerRef = useRef<HTMLDivElement>(null)

    const [triggerRect, setTriggerRect] = useState<DOMRect>()
    const [hitPosition, setHitPosition] = useState<[number, number]>()
    const [active, setActive] = useState(false)
    const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null)

    const [bounds, setBounds] = useState(createBounds())

    useEffect(() => {
        const onResize = () => {
            setBounds(createBounds())
        }
        window.addEventListener('resize', onResize)
        return () => {
            window.removeEventListener('resize', onResize)
        }
    }, [])

    useEffect(() => {
        if (!triggerRef) return
        const domRect = triggerRef.getBoundingClientRect()
        setTriggerRect(domRect)
    }, [triggerRef, active, bounds])

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

    // handles cancelling of overlay
    useEffect(() => {
        if (!active) return
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

    const closeCard = useCallback(() => {
        setActive(false)
    }, [])

    return !children ? null : (
        <CardOpenerContext.Provider value={{ placement, closeCard }}>
            {children({
                triggerProps: {
                    tabIndex: 0,
                    ref: setTriggerRef,
                    onClick: trigger === Trigger.click ? onClick : undefined,
                    onContextMenu: trigger === Trigger.contextmenu ? onContextMenu : undefined,
                    cursor: 'pointer',
                },
            })}
            {active &&
                triggerRect &&
                render &&
                createPortal(
                    <OverlayContainer
                        margin={props.margin}
                        containerRef={containerRef}
                        render={render}
                        triggerRect={triggerRect}
                        hitPosition={hitPosition}
                        placement={placement}
                    />,
                    root,
                )}
        </CardOpenerContext.Provider>
    )
}
