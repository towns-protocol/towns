import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { NodeAnimationContext } from '@components/NodeAnimation/NodeAnimationContext'
import { createNoise } from '../utils/quickNoise'
import { randxy, smoothstep } from '../utils/globeUtils'

const textureSize = [2000, 1000] as [number, number]

export const useGlobeTexture = (
    noise: ReturnType<typeof createNoise>,
    mapSize: [number, number],
) => {
    const { darkMode } = useContext(NodeAnimationContext)
    const [{ canvas, ctx }] = useState(() => {
        const canvas =
            (document.getElementById('canvas') as HTMLCanvasElement) ||
            document.createElement('canvas')

        canvas.width = textureSize[0]
        canvas.height = textureSize[1]

        const ctx = canvas.getContext('2d')

        return { canvas, ctx }
    })

    const [textureData] = useState(() => createTextureData(noise, mapSize).textureData)

    // ...relevant for space creation animation
    const relevantPoints = useMemo(() => {
        return textureData
            .reduce((acc, v, i) => {
                if (v.value === 1 && Math.abs(v.xy[1] - 0.5) < 0.45) {
                    const textureDotOffset = -0.019
                    acc.push({
                        id: `dot-${i}`,
                        index: i,
                        color: '#fff',
                        value: v.value,
                        xy: [
                            (v.xy[0] * 0.5 - 1) * -Math.PI + textureDotOffset,
                            (v.xy[1] - 0.5) * -Math.PI,
                        ],
                    })
                }
                return acc
            }, [] as { id: string; index: number; color: string; value: number; xy: [number, number] }[])
            .sort((a, b) => Math.random() - 0.5)
            .slice(0, 300)
    }, [textureData])

    const update = useCallback(() => {
        if (ctx) {
            drawTexture(ctx, textureData, darkMode)
        }
    }, [ctx, darkMode, textureData])

    useEffect(() => {
        update()
    }, [update])

    const { point: homePoint } = useMemo(() => {
        // find the closest point from the center of the globe
        return relevantPoints.reduce(
            (acc, v) => {
                const vx = Math.abs(v.xy[1] - 0.4)
                const vy = Math.abs(v.xy[0] - Math.PI / 2 - 0.5)
                const dist = Math.sqrt(vx * vx + vy * vy)
                if (!acc.point || dist < acc.dist) {
                    acc.point = v
                    acc.dist = dist
                }

                return acc
            },
            {
                point: undefined as (typeof relevantPoints)[0] | undefined,
                dist: Number.MAX_SAFE_INTEGER,
            },
        )
    }, [relevantPoints])

    return { canvas, update, relevantPoints, homePoint }
}

const createTextureData = (noise: ReturnType<typeof createNoise>, mapSize: [number, number]) => {
    const lx = mapSize[0]
    const ly = mapSize[1]

    const textureData: { value: number; xy: [number, number] }[] = Array.from({ length: lx * ly })

    for (let i = 0; i < lx * ly; i++) {
        const x = i % lx
        const y = Math.floor(i / lx)

        const tx = (x / ly) * 2
        const ty = (y / ly) * 1

        const pp = (x: number, y: number, d: number) =>
            noise(x * d * 0.5, y * d * 1, 0, d, d, 0) * 0.5 + 0.5

        let pa = 0.27 + pp(tx, ty, 4) * 0.4 + 0.35 * pp(tx, ty, 6) + 0.25 * pp(tx, ty, 20)
        pa *= 1
        pa *= smoothstep(0, 0.25, Math.abs(Math.sin(ty * Math.PI * 1)))

        const ri1 = randxy(x, y, 2) / 0xffffffff
        const value =
            pa < 0.75
                ? y > 5 && ((pa > 0.7 && ri1 < 0.1) || (pa > 0.6 && ri1 < 0.02))
                    ? 1
                    : 0.3
                : 0.1

        textureData[i] = {
            value,
            xy: [tx, ty],
        }
        // for debugging
        // textureData[i] = { value: y === 50 && x === 50 ? 1 : 0.5, xy: [tx, ty], }
    }

    return { textureData }
}

const drawTexture = (
    ctx: CanvasRenderingContext2D,
    data: { value: number; xy: [number, number] }[],
    darkMode: boolean,
) => {
    ctx.fillStyle = darkMode ? `hsla(260, 9%, 0%, 1)` : `#fff0`
    ctx.fillRect(0, 0, textureSize[0], textureSize[1])

    let lightness = 0

    for (let i = 0; i < data.length; i++) {
        // 0 - 1
        const x = data[i].xy[0] / 4
        const y = data[i].xy[1]

        const intensity = data[i].value

        if (darkMode) {
            lightness = intensity >= 0.6 ? 80 : intensity >= 0.3 ? 30 + intensity * 10 : 20
        } else {
            lightness = intensity >= 0.3 ? 10 : 80
        }
        const color = `hsla(0, 0%, ${lightness}%, 1)`

        const size = intensity >= 0.3 ? 3.5 : 3.5

        ctx.fillStyle = color

        ctx.beginPath()
        ctx.arc(x * textureSize[0] + 5, y * textureSize[1], size, 0, 2 * Math.PI)
        ctx.fill()
    }
}
