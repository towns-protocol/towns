// infura can return `null` values, remove them
export function removeNullCollectionValues<T>(collection: T) {
    const coll = collection
    for (const key in coll) {
        const typedKey = key as keyof typeof collection
        if (coll[typedKey] === null) {
            delete coll[typedKey]
        }
    }
    return coll as typeof collection
}
