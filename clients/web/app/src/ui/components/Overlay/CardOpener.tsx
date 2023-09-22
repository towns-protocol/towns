import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEvent } from 'react-use-event-hook'
import { useZLayerContext } from '../ZLayer/ZLayer'
import { CardOpenerContext } from './CardOpenerContext'
import { Placement } from './types'
import { OverlayContainer } from './CardOverlayContainer'

const Trigger = {
    click: 'click',
    contextmenu: 'contextmenu',
} as const

type Props = {
    layoutId?: string
    placement?: Placement
    children?: (renderProps: { triggerProps: TriggerProps }) => React.ReactNode
    render: JSX.Element | undefined
    trigger?: (typeof Trigger)[keyof typeof Trigger]
    onClose?: () => void
    tabIndex?: number
    toggleRef?: React.MutableRefObject<(() => void) | undefined>
}

type TriggerProps = {
    ref: (ref: HTMLElement | null) => void
    onClick?: (e: React.MouseEvent) => void
    onKeyDown?: (e: React.KeyboardEvent) => void
    onContextMenu?: (e: React.MouseEvent) => void
    tabIndex?: number
    cursor: 'pointer'
}

// keeping this for further refactoring
const KEEP_OPEN_ON_CLICK_INSIDE = true

const createBounds = () => ({
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
})

export const CardOpener = (props: Props) => {
    const {
        children,
        render,
        trigger = Trigger.click,
        placement = 'horizontal',
        onClose,
        tabIndex,
        toggleRef,
    } = props

    const { rootLayerRef } = useZLayerContext()
    const root = rootLayerRef?.current ?? document.body

    const containerRef = useRef<HTMLDivElement>(null)

    const [triggerRect, setTriggerRect] = useState<DOMRect>()
    const [hitPosition, setHitPosition] = useState<[number, number]>()
    const [active, setActive] = useState(false)
    const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null)

    const [bounds, setBounds] = useState(createBounds())

    useEffect(() => {
        if (toggleRef) {
            toggleRef.current = () => {
                setActive((a) => !a)
            }
        }
    }, [toggleRef])

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
        if (!triggerRef || !active) {
            return
        }
        const domRect = triggerRef.getBoundingClientRect()
        setTriggerRect(domRect)
    }, [triggerRef, bounds, active])

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

        const onGlobalKeyDown = (e: KeyboardEvent) => {
            console.log(e.key)
            if (e.key.match(/escape/i)) {
                setActive(false)
            }
        }

        // if we add the handled to current callstack the listener gets called
        // immediately which is not the intention
        setTimeout(() => {
            window.addEventListener('click', onGlobalClick)
            window.addEventListener('contextmenu', onGlobalClick)
            window.addEventListener('keydown', onGlobalKeyDown)
        })
        return () => {
            window.removeEventListener('click', onGlobalClick)
            window.removeEventListener('contextmenu', onGlobalClick)
            window.removeEventListener('keydown', onGlobalKeyDown)
        }
    }, [active, trigger])

    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        if (!active && onCloseRef.current) {
            onCloseRef.current()
        }
    }, [active])

    const onClick = useCallback(
        (e: React.MouseEvent) => {
            if (trigger === Trigger.click) {
                e.preventDefault()
                updateCoordsFromEvent(e)
                setActive(true)
            }
        },
        [trigger, updateCoordsFromEvent],
    )

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (trigger === Trigger.click && e.key.match(/space|enter/i)) {
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
                    tabIndex,
                    ref: setTriggerRef,
                    onClick: trigger === Trigger.click ? onClick : undefined,
                    onKeyDown: trigger === Trigger.click ? onKeyDown : undefined,
                    onContextMenu: trigger === Trigger.contextmenu ? onContextMenu : undefined,
                    cursor: 'pointer',
                },
            })}
            {active &&
                triggerRect &&
                render &&
                createPortal(
                    <OverlayContainer
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
