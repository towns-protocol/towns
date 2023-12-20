export class Cache {
    storage?: globalThis.Cache
    static async open(name: string): Promise<Cache> {
        const cache = new Cache()
        cache.storage = 'caches' in self ? await caches.open(name) : undefined
        return cache
    }

    async match(request: string): Promise<Uint8Array | undefined> {
        const blob = await this.storage?.match(request)
        if (!blob) {
            return undefined
        }
        return new Uint8Array(await blob.arrayBuffer())
    }

    async put(request: string, data: Uint8Array) {
        await this.storage?.put(
            request,
            new Response(new Blob([data]), {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': data.length.toString(),
                },
            }),
        )
    }
}
