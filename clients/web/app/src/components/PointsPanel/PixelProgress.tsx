import React, { useEffect, useRef, useState } from 'react'

import { SECOND_MS } from 'data/constants'
import { PixelFontFamily, YELLOW1, YELLOW2 } from './PointsPanelConstants'

export const PixelProgress = () => {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((p) =>
                p < 0.2 ? p + 0.1 : p < 0.5 ? p + 0.01 : p < 0.8 ? p + 0.003 : p + (0.98 - p) / 30,
            )
        }, SECOND_MS / 12)

        return () => {
            clearInterval(interval)
        }
    }, [])

    const canvasRef = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
        if (!canvasRef.current) {
            return
        }

        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        if (!context) {
            return
        }

        context.imageSmoothingEnabled = false
        context.clearRect(0, 0, canvas.width, canvas.height)

        const width = 120
        const height = 18

        const x = Math.round(canvas.width / 2 - width / 2)
        const y = Math.round(canvas.height / 2 - height / 2)

        context.fillStyle = YELLOW1
        context.beginPath()
        context.roundRect(x, y, width, height, height / 2)
        context.fill()
        context.strokeStyle = '#000000'
        context.lineWidth = 1
        context.stroke()

        if (progress > 0) {
            const p = 1
            const w = width - p * 2
            const h = height - p * 2

            context.beginPath()
            context.roundRect(x + p, y + p, Math.max(height, w), h, (height - p * 2) / 2)
            context.clip()

            context.fillStyle = YELLOW2
            context.fillRect(x + p, y + p, Math.max(height, progress * w), h)
        }

        context.font = `8px ${PixelFontFamily}`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillStyle = '#000000'
        context.fillText(
            `Transferring points...`,
            Math.floor(x + width / 2),
            Math.floor(y + height / 2) + 1,
        )
    }, [canvasRef, progress])
    return <canvas ref={canvasRef} width={170} height={60} style={{ transform: 'scale(1.5)' }} />
}
