import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IAppInstaller__factory } from '@towns-protocol/generated/dev/typings/factories/IAppInstaller__factory'

const { abi, connect } = IAppInstaller__factory

export class IAppInstallerShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
