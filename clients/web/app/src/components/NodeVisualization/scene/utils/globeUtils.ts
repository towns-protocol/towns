export const getPosition = (x: number, y: number, r: number) => {
    return [r * Math.cos(y) * Math.cos(x), r * Math.sin(y), r * Math.cos(y) * Math.sin(x)] as [
        number,
        number,
        number,
    ]
}
