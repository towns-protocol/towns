import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { PixelFontFamily, YELLOW2 } from './PointsPanelConstants'

export const RubBellyPill = forwardRef<HTMLCanvasElement>((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useImperativeHandle(ref, () => canvasRef.current!, [])

    useEffect(() => {
        if (!canvasRef.current) {
            return
        }

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context) {
            return
        }

        const width = 60
        const height = 18

        const x = Math.round(canvas.width / 2 - width / 2)
        const y = Math.round(canvas.height / 2 - height / 2)

        context.imageSmoothingEnabled = false
        context.clearRect(0, 0, canvas.width, canvas.height)

        context.fillStyle = YELLOW2
        context.beginPath()
        context.roundRect(x, y, width, height, height / 2)
        context.fill()
        context.strokeStyle = '#000000'
        context.lineWidth = 1
        context.stroke()

        context.font = `8px ${PixelFontFamily}`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillStyle = '#000000'
        context.fillText(
            `Rub belly`,
            Math.floor(canvas.width / 2),
            Math.floor(canvas.height / 2) + 1,
        )
    }, [canvasRef])

    return (
        <canvas
            ref={canvasRef}
            width={120}
            height={24}
            style={{ transform: 'scale(2)', imageRendering: 'pixelated' }}
        />
    )
})
