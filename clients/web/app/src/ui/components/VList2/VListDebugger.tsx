import React, { MutableRefObject, useCallback, useLayoutEffect, useRef } from 'react'

type Props<T> = {
    items: T[]
    debugRef: MutableRefObject<(() => void) | undefined>
    itemCache: ItemCacheMap
    containerRef: MutableRefObject<HTMLDivElement | null>
    contentHeightRef: MutableRefObject<number>
    pinnedItemRef: MutableRefObject<{ key: string; y: number } | undefined>
    renderItems: string[]
    generateKey: (item: T) => string
    anchorDiffRef: MutableRefObject<number>
}

export const VListDebugger = <T,>(props: Props<T>) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const {
        items,
        itemCache,
        contentHeightRef,
        containerRef,
        pinnedItemRef,
        generateKey,
        anchorDiffRef: referenceDiffRef,
    } = props

    const containerSize = containerRef.current?.getBoundingClientRect()

    const updateCallback = useCallback(() => {
        const canvas = canvasRef.current

        if (!canvas || typeof containerSize === 'undefined') {
            return
        }

        const width = Math.min(window.innerWidth / 7, 80)
        const ratio = width / containerSize.width
        const height = contentHeightRef.current * ratio

        if (canvas.height !== height || canvas.width !== width) {
            canvas.width = width
            canvas.height = height
            canvas.style.width = `${width / 2}px`
        }

        const context = canvas.getContext('2d')

        if (!context) {
            return
        }

        items.forEach((item) => {
            const key = generateKey(item)
            const cacheItem = itemCache[key]
            if (typeof cacheItem?.y === 'undefined') {
                return
            }
            context.beginPath()
            context.save()

            if (pinnedItemRef?.current?.key === key) {
                context.fillStyle = `#696f`
                // } else if (renderItems.includes(key)) {
                //     context.fillStyle = `#6f69`
            } else {
                context.fillStyle = cacheItem.metadata.isMeasured ? `#09f7` : `#f907`
            }

            context.lineWidth = 0.25
            context.rect(5, cacheItem.y * ratio + 0.1, width, cacheItem.height * ratio - 0.5)
            context.stroke()
            context.fill()
            context.restore()
        }, [])

        // viewport
        context.fillStyle = '#F60'
        context.lineWidth = 2
        referenceDiffRef.current
        let scrollTop = containerRef.current?.scrollTop ?? 0
        scrollTop -= referenceDiffRef.current

        context.fillRect(0, scrollTop * ratio, 2, containerSize.height * ratio)

        context.lineWidth = 0.5
        context.fillStyle = '#f0f3'

        context.rect(
            0,
            scrollTop * ratio,
            containerSize.width * ratio,
            containerSize.height * ratio,
        )
        context.fill()

        context.save()
        context.lineWidth = 1
        context.strokeStyle = '#ff0'
        context.rect(
            3,
            referenceDiffRef.current * ratio,
            containerSize.width * ratio - 3,
            (contentHeightRef.current ?? 0) * ratio,
        )
        context.stroke()
        context.restore()

        canvasRef.current.style.transform = `translateY(calc(0px - ${(scrollTop * ratio) / 2}px))`
    }, [
        containerRef,
        containerSize,
        contentHeightRef,
        generateKey,
        itemCache,
        items,
        pinnedItemRef,
        referenceDiffRef,
    ])

    useLayoutEffect(() => {
        props.debugRef.current = updateCallback
        updateCallback()
    }, [props.debugRef, updateCallback])

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                right: 25,
                overflow: `hidden`,
                height: `100%`,
                pointerEvents: `none`,
            }}
        >
            <div style={{ height: '100%', transform: `translateY(50%)` }}>
                <canvas width={1} ref={canvasRef} />
            </div>
        </div>
    )
}
