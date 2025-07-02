export function logObservable<T>(name: string): (value: T) => T {
    return (value) => {
        // eslint-disable-next-line no-console
        console.log(name)
        // eslint-disable-next-line no-console
        console.dir(value, { depth: null })
        return value
    }
}
