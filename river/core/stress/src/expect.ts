// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const expect = (a: any) => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toEqual: (b: any) => {
        if (a === b) return
        throw new Error(`expected ${a} to equal ${b}`)
    },
})
