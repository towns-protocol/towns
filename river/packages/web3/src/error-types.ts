export class WalletAlreadyLinkedError extends Error {
    constructor(message?: string) {
        super(message ?? 'Wallet is already linked')
        this.name = 'SpaceDappWalletLinkLinkAlreadyExists'
    }
}

export class WalletNotLinkedError extends Error {
    constructor(message?: string) {
        super(message ?? 'Wallet is not linked')
        this.name = 'SpaceDappWalletLinkLinkDoesNotExist'
    }
}
