export enum InvalidCryptoStoreState {
    TooNew = 'TOO_NEW',
}

export class InvalidCryptoStoreError extends Error {
    public static TOO_NEW = InvalidCryptoStoreState.TooNew

    public constructor(public readonly reason: InvalidCryptoStoreState) {
        const message =
            `Crypto store is invalid because ${reason}, ` +
            `please stop the client, delete all data and start the client again`
        super(message)
        this.name = 'InvalidCryptoStoreError'
    }
}

export enum InvalidStoreState {
    ToggledLazyLoading,
}
