import { Vector3 } from 'three'

export const getPosition = (x: number, y: number, r: number) => {
    return [r * Math.cos(y) * Math.cos(x), r * Math.sin(y), r * Math.cos(y) * Math.sin(x)] as [
        number,
        number,
        number,
    ]
}

const temp = new Vector3()

export function slerp(p1: Vector3, p2: Vector3, t: number, dest: Vector3) {
    const v1 = p1.normalize()
    const v2 = p2.normalize()
    const dot = temp.copy(v1).dot(v2)
    const theta = Math.acos(dot)
    const sinTheta = Math.sin(theta)
    const s1 = Math.sin((1 - t) * theta) / sinTheta
    const s2 = Math.sin(t * theta) / sinTheta
    return dest.set(s1 * v1.x + s2 * v2.x, s1 * v1.y + s2 * v2.y, s1 * v1.z + s2 * v2.z)
}

export const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
    return x * x * (3 - 2 * x)
}

export const randxy = (x: number, y: number, seed: number) => {
    let h = seed + x * 374761393 + y * 668265263
    h = (h ^ (h >> 13)) * 1274126177
    return h ^ (h >> 16)
}
