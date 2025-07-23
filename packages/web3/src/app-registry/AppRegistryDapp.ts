import { ethers, type BigNumber, type ContractReceipt, type ContractTransaction } from 'ethers'
import { BaseChainConfig } from '../utils/IStaticContractsInfo'
import type { Address } from 'viem'
import { IAppRegistryShim } from './IAppRegistryShim'
import { SimpleAppShim } from './SimpleAppShim'
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
    public readonly shim: IAppRegistryShim
    private readonly provider: ethers.providers.Provider

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        if (!config.addresses.appRegistry) {
            throw new Error('App registry address is not set')
        }
        this.shim = new IAppRegistryShim(config.addresses.appRegistry, provider)
        this.provider = provider
    }

    public callApp(appAddress: Address): SimpleAppShim {
        return new SimpleAppShim(appAddress, this.provider)
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
        return this.shim.write(signer).createApp({
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
                const parsedLog = this.shim.interface.parseLog(log)
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
                const parsedLog = this.shim.interface.parseLog(log)
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
        return this.shim.write(signer).registerApp(app, client)
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
        /** The data to pass to the app's onInstall function */
        data?: Uint8Array,
    ): Promise<ContractTransaction> {
        return this.shim
            .write(signer)
            .installApp(app, spaceAddress, data ?? new Uint8Array(0), { value: price })
    }

    /** To uninstall a smart contract app from a space */
    public async uninstallApp(
        /** The signer of the app owner */
        signer: ethers.Signer,
        /** The address of the app to uninstall */
        app: Address,
        /** The address of the space to uninstall the app from */
        spaceAddress: Address,
        /** The data to pass to the app's onUninstall function */
        data?: Uint8Array,
    ): Promise<ContractTransaction> {
        return this.shim.write(signer).uninstallApp(app, spaceAddress, data ?? new Uint8Array(0))
    }

    public async removeApp(signer: ethers.Signer, appId: string): Promise<ContractTransaction> {
        return this.shim.write(signer).removeApp(appId)
    }

    public async getAppPrice(app: Address): Promise<BigNumber> {
        return this.shim.read.getAppPrice(app)
    }

    public async getAppDuration(app: Address): Promise<number> {
        return this.shim.read.getAppDuration(app)
    }

    public async getAppSchema(): Promise<string> {
        return this.shim.read.getAppSchema()
    }

    public async getAppSchemaId(): Promise<string> {
        return this.shim.read.getAppSchemaId()
    }

    public async isAppBanned(app: Address): Promise<boolean> {
        return this.shim.read.isAppBanned(app)
    }

    public async getLatestAppId(app: Address): Promise<string> {
        return this.shim.read.getLatestAppId(app)
    }

    public async getAppById(appId: string): Promise<IAppRegistryBase.AppStructOutput> {
        return this.shim.read.getAppById(appId)
    }

    public async adminRegisterAppSchema(
        signer: ethers.Signer,
        schema: string,
        resolver: Address,
        revocable: boolean,
    ): Promise<ContractTransaction> {
        return this.shim.write(signer).adminRegisterAppSchema(schema, resolver, revocable)
    }

    public async adminBanApp(signer: ethers.Signer, app: Address): Promise<ContractTransaction> {
        return this.shim.write(signer).adminBanApp(app)
    }

    public async getAllAppsByOwner(targetOwner: Address, fromBlock?: number) {
        const appCreatedEvents = await this.shim.read.queryFilter(
            this.shim.read.filters.AppCreated(),
            fromBlock,
        )

        const appRegisteredEvents = await this.shim.read.queryFilter(
            this.shim.read.filters.AppRegistered(),
            fromBlock,
        )

        const allAppIds = new Set([
            ...appCreatedEvents.map((event) => event.args.uid),
            ...appRegisteredEvents.map((event) => event.args.uid),
        ])

        const ownerApps: BotInfo[] = []
        for (const appId of allAppIds) {
            try {
                const app = await this.shim.read.getAppById(appId)
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
