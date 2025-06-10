import { ethers, type ContractReceipt, type ContractTransaction } from 'ethers'
import { BaseChainConfig } from '../utils/IStaticContractsInfo'
import type { Address } from 'viem'
import { IAppRegistryShim } from './IAppRegistryShim'
import type {
    AppCreatedEventObject,
    AttestationStructOutput,
} from '@towns-protocol/generated/dev/typings/IAppRegistry'
import { Permission } from '../types/ContractTypes'

type NonEmptyArray<T> = [T, ...T[]]

export class AppRegistryDapp {
    private readonly appRegistry: IAppRegistryShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        if (!config.addresses.appRegistry) {
            throw new Error('App registry address is not set')
        }
        this.appRegistry = new IAppRegistryShim(config.addresses.appRegistry, provider)
    }

    public async createApp(
        signer: ethers.Signer,
        name: string,
        permissions: NonEmptyArray<Permission>,
        clients: NonEmptyArray<Address>,
    ): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).createApp({
            name,
            permissions: permissions.map((p) => ethers.utils.formatBytes32String(Permission[p])),
            clients,
        })
    }

    public getCreateAppEvent(receipt: ContractReceipt): AppCreatedEventObject {
        for (const log of receipt.logs) {
            try {
                const parsedLog = this.appRegistry.interface.parseLog(log)
                if (parsedLog.name === 'AppCreated') {
                    return {
                        app: parsedLog.args.app,
                        uid: parsedLog.args.uid,
                    } satisfies AppCreatedEventObject
                }
            } catch {
                // no need for error, this log is not from the contract we're interested in
            }
        }
        return { app: '', uid: '' }
    }

    public async registerApp(
        signer: ethers.Signer,
        app: Address,
        clients: Address[],
    ): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).registerApp(app, clients, {
            gasLimit: 100_000,
            maxFeePerGas: 100_000,
            maxPriorityFeePerGas: 100_000,
        })
    }

    public async removeApp(signer: ethers.Signer, appId: string): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).removeApp(appId)
    }

    public async getAppSchema(): Promise<string> {
        return this.appRegistry.read.getAppSchema()
    }

    public async getAppSchemaId(): Promise<string> {
        return this.appRegistry.read.getAppSchemaId()
    }

    public async isAppBanned(app: Address): Promise<boolean> {
        return this.appRegistry.read.isAppBanned(app)
    }
    public async getAttestation(appId: string): Promise<AttestationStructOutput> {
        return this.appRegistry.read.getAttestation(appId)
    }

    public async getLatestAppId(app: Address): Promise<string> {
        return this.appRegistry.read.getLatestAppId(app)
    }

    public async adminRegisterAppSchema(
        signer: ethers.Signer,
        schema: string,
        resolver: Address,
        revocable: boolean,
    ): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).adminRegisterAppSchema(schema, resolver, revocable)
    }

    public async adminBanApp(signer: ethers.Signer, app: Address): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).adminBanApp(app)
    }
}
