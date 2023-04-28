import {
    Address,
    Chain,
    ConnectorData,
    ConnectorNotFoundError,
    Ethereum,
    InjectedConnector,
    InjectedConnectorOptions,
} from '@wagmi/core'
import { NULL_ADDRESS } from '../types/web3-types'
import { getAddress } from '@ethersproject/address'

export type InjectorOptions = {
    chains?: Chain[]
    options?: InjectedConnectorOptions
}

// the injected connector emits the disconnect event when the
// last account is disconnected from the app. This kicks the user out of the app.
// We want to keep the user logged in even if their wallet is disconnected from the app.
// So we override the injected connector to not emit the disconnect event, among
// other changes
export class CustomInjectedConnector extends InjectedConnector {
    constructor(options?: InjectorOptions) {
        super(options)
    }

    // bug in the injected connector, this function throws an error
    // because it assumes accounts[0] is always defined,
    // but if the wallet is locked, or the user has not connected their wallet,
    // then accounts[] is empty.
    public override async getAccount(): Promise<Address> {
        const provider = await this.getProvider()
        if (!provider) {
            throw new ConnectorNotFoundError()
        }
        const accounts = await provider.request({
            method: 'eth_accounts',
        })
        if (accounts.length) {
            return getAddress(accounts[0])
        }
        // set to NULL_ADDRESS when wallet is disconnected or locked
        return NULL_ADDRESS
    }

    protected override onAccountsChanged = (accounts: string[]): void => {
        // emit an event when accounts changed
        console.log('CustomInjectedConnector.onAccountsChanged', accounts)
        let account: Address | undefined = undefined
        if (accounts.length > 0) {
            account = getAddress(accounts[0])
        } else {
            // set to NULL_ADDRESS when wallet is disconnected
            account = NULL_ADDRESS
        }
        const data: ConnectorData<Ethereum | undefined> = {
            account: account,
        }
        this.emit('change', data)
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    protected override onDisconnect = async (_error: Error): Promise<void> => {
        // emit an event when wallet is disconnected
        console.log('CustomInjectedConnector.onDisconnect')
        this.emit('disconnect')
    }
}
