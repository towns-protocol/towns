import React, { useEffect, useRef, useState } from 'react'
import { SECOND_MS } from 'data/constants'
import { SpriteSequencer } from './SpriteSequencer'
import coinSpriteSheet from './assets/sprites-coin.png'
import coinSpriteSheetData from './assets/sprites-coin.json'

export type CoinData = {
    pos: { x: number; y: number; t: number }
    key: string
    delay: number
}

type CoinProps = {
    data: CoinData
    onComplete: (coin: CoinData) => void
}

export const Coin = (props: CoinProps) => {
    const { data, onComplete } = props
    const ref = useRef<HTMLCanvasElement>(null)
    const [coin] = useState(() => {
        return new SpriteSequencer(coinSpriteSheet, coinSpriteSheetData).play('coin', {
            startFrame: Math.floor(Math.random() * 12),
        })
    })

    useEffect(() => {
        if (!ref.current) {
            return
        }

        const pos = data.pos

        const frames = 12 * 2
        const step = 1 / frames
        const c = { ...pos }

        const animate = () => {
            if (!ref.current) {
                return
            }
            coin.tick()
            coin.draw(ref.current)

            ref.current.style.transform = `translate(${pos.x}px, ${pos.y}px)`

            pos.x = (1 - pos.t) * c.x + Math.sin(pos.t * Math.PI) * 100
            pos.y = (1 - pos.t) * c.y
            pos.t += step

            if (pos.t >= 1) {
                onComplete(data)
            } else {
                timeout = setTimeout(animate, SECOND_MS / 12)
            }
        }

        let timeout = setTimeout(() => {
            animate()
        }, data.delay)

        return () => {
            clearTimeout(timeout)
        }
    }, [coin, data, data.pos, onComplete])

    return (
        <canvas
            ref={ref}
            width={32}
            height={32}
            style={{
                position: 'absolute',
                imageRendering: 'pixelated',
            }}
        />
    )
}
