import { ethers, type ContractReceipt, type ContractTransaction } from 'ethers'
import { BaseChainConfig } from '../utils/IStaticContractsInfo'
import type { Address } from 'viem'
import { IAppRegistryShim } from './IAppRegistryShim'
import type {
    AppCreatedEventObject,
    AppRegisteredEventObject,
    IAppRegistryBase,
} from '@towns-protocol/generated/dev/typings/IAppRegistry'
import { Permission } from '../types/ContractTypes'

export type BotInfo = {
    appId: Address
    app: {
        client: Address
        module: Address
        owner: Address
        permissions: Permission[]
    }
}

export class AppRegistryDapp {
    private readonly appRegistry: IAppRegistryShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        if (!config.addresses.appRegistry) {
            throw new Error('App registry address is not set')
        }
        this.appRegistry = new IAppRegistryShim(config.addresses.appRegistry, provider)
    }

    // TODO: better api for passing access duration
    public async createApp(
        signer: ethers.Signer,
        name: string,
        permissions: Permission[],
        client: Address,
        installPrice: bigint,
        accessDuration: bigint, // in seconds
    ): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).createApp({
            name,
            permissions: permissions.map((p) => ethers.utils.formatBytes32String(Permission[p])),
            client,
            installPrice,
            accessDuration,
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

    public getRegisterAppEvent(receipt: ContractReceipt): AppRegisteredEventObject {
        for (const log of receipt.logs) {
            try {
                const parsedLog = this.appRegistry.interface.parseLog(log)
                if (parsedLog.name === 'AppRegistered') {
                    return {
                        app: parsedLog.args.app,
                        uid: parsedLog.args.uid,
                    } satisfies AppRegisteredEventObject
                }
            } catch {
                // no need for error, this log is not from the contract we're interested in
            }
        }
        return { app: '', uid: '' }
    }

    /** To register a smart contract app with a App Client */
    public async registerApp(
        signer: ethers.Signer,
        app: Address,
        client: Address,
    ): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).registerApp(app, client)
    }

    /** To install a smart contract app in a space */
    public async installApp(
        /** The signer of the app owner */
        signer: ethers.Signer,
        /** The address of the app to install */
        app: Address,
        /** The address of the space to install the app in */
        spaceAddress: Address,
        /** The price of the app in wei */
        price: bigint,
    ): Promise<ContractTransaction> {
        return this.appRegistry.write(signer).installApp(app, spaceAddress, new Uint8Array(0), {
            gasLimit: 1_000_000,
            maxFeePerGas: 20_000_000_000,
            maxPriorityFeePerGas: 1_000_000_000,
            value: price,
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

    public async getLatestAppId(app: Address): Promise<string> {
        return this.appRegistry.read.getLatestAppId(app)
    }

    public async getAppById(appId: string): Promise<IAppRegistryBase.AppStructOutput> {
        return this.appRegistry.read.getAppById(appId)
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

    public async getAllAppsByOwner(targetOwner: Address, fromBlock?: number) {
        const appCreatedEvents = await this.appRegistry.read.queryFilter(
            this.appRegistry.read.filters.AppCreated(),
            fromBlock,
        )

        const appRegisteredEvents = await this.appRegistry.read.queryFilter(
            this.appRegistry.read.filters.AppRegistered(),
            fromBlock,
        )

        const allAppIds = new Set([
            ...appCreatedEvents.map((event) => event.args.uid),
            ...appRegisteredEvents.map((event) => event.args.uid),
        ])

        const ownerApps: BotInfo[] = []
        for (const appId of allAppIds) {
            try {
                const app = await this.appRegistry.read.getAppById(appId)
                if (app.owner.toLowerCase() === targetOwner.toLowerCase()) {
                    ownerApps.push({
                        appId: appId as Address,
                        app: {
                            client: app.client as Address,
                            module: app.module as Address,
                            owner: app.owner as Address,
                            permissions: app.permissions.map(
                                (p) =>
                                    Permission[
                                        ethers.utils.parseBytes32String(
                                            p,
                                        ) as keyof typeof Permission
                                    ],
                            ),
                        },
                    })
                }
            } catch {
                // no need for error, this app is not from the owner
            }
        }

        return ownerApps
    }
}
