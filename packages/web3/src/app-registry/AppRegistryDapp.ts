import { ethers, type BigNumber, type ContractReceipt, type ContractTransaction } from 'ethers'
import { BaseChainConfig } from '../utils/web3Env'
import type { Address } from 'viem'
import { IAppRegistryShim } from './IAppRegistryShim'
import { IAppInstallerShim } from './IAppInstallerShim'
import { IAppFactoryShim } from './IAppFactoryShim'
import { SimpleAppShim } from './SimpleAppShim'
import type {
    AppRegisteredEventObject,
    IAppRegistryBase,
} from '@towns-protocol/generated/dev/typings/IAppRegistry'

import type { AppCreatedEventObject } from '@towns-protocol/generated/dev/typings/IAppFactory'
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
    public readonly registry: IAppRegistryShim
    public readonly installer: IAppInstallerShim
    public readonly factory: IAppFactoryShim
    private readonly provider: ethers.providers.Provider

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        if (!config.addresses.appRegistry) {
            throw new Error('App registry address is not set')
        }
        this.registry = new IAppRegistryShim(config.addresses.appRegistry, provider)
        this.installer = new IAppInstallerShim(config.addresses.appRegistry, provider)
        this.factory = new IAppFactoryShim(config.addresses.appRegistry, provider)
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
        return this.factory.write(signer).createApp({
            name,
            permissions: permissions.map((p) => ethers.utils.formatBytes32String(Permission[p])),
            client,
            installPrice,
            accessDuration,
        })
    }

    public async getCreateAppEvent(
        receipt: ContractReceipt,
        senderAddress: Address,
    ): Promise<AppCreatedEventObject> {
        const appCreatedEvents = receipt.logs
            .map((log) => {
                try {
                    const parsedLog = this.factory.interface.parseLog(log)
                    if (parsedLog.name === 'AppCreated') {
                        return {
                            app: parsedLog.args.app,
                            uid: parsedLog.args.uid,
                        } satisfies AppCreatedEventObject
                    }
                } catch {
                    // no need for error, this log is not from the contract we're interested in
                }
                return undefined
            })
            .filter((x) => x !== undefined)

        if (appCreatedEvents.length === 0) {
            throw new Error('No app created event found')
        }
        if (appCreatedEvents.length === 1) {
            return appCreatedEvents[0]
        }
        // more than one app created event found, we need to check if the sender is the owner of the app
        let lastError: Error | undefined = undefined
        let numRetires = 3
        while (numRetires > 0) {
            for (const event of appCreatedEvents) {
                try {
                    const app = await this.getAppById(event.uid as string)
                    const isOwner = app.owner.toLowerCase() === senderAddress.toLowerCase()
                    if (isOwner) {
                        return event
                    }
                } catch (error) {
                    lastError = error as Error
                }
            }
            numRetires--
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
        if (lastError) {
            throw lastError
        }
        throw new Error('No app created event with owner found')
    }

    public async getRegisterAppEvent(
        receipt: ContractReceipt,
        senderAddress: Address,
    ): Promise<AppRegisteredEventObject> {
        for (const log of receipt.logs) {
            try {
                const parsedLog = this.registry.interface.parseLog(log)
                if (parsedLog.name === 'AppRegistered') {
                    const app = await this.getAppById(parsedLog.args.uid as string)
                    const isOwner = app.owner.toLowerCase() === senderAddress.toLowerCase()
                    if (!isOwner) {
                        continue
                    }
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
        return this.registry.write(signer).registerApp(app, client)
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
        return this.installer
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
        return this.installer
            .write(signer)
            .uninstallApp(app, spaceAddress, data ?? new Uint8Array(0))
    }

    public async removeApp(signer: ethers.Signer, appId: string): Promise<ContractTransaction> {
        return this.registry.write(signer).removeApp(appId)
    }

    public async getAppPrice(app: Address): Promise<BigNumber> {
        return this.registry.read.getAppPrice(app)
    }

    public async getAppDuration(app: Address): Promise<number> {
        return this.registry.read.getAppDuration(app)
    }

    public async getAppSchema(): Promise<string> {
        return this.registry.read.getAppSchema()
    }

    public async getAppSchemaId(): Promise<string> {
        return this.registry.read.getAppSchemaId()
    }

    public async isAppBanned(app: Address): Promise<boolean> {
        return this.registry.read.isAppBanned(app)
    }

    public async getLatestAppId(app: Address): Promise<string> {
        return this.registry.read.getLatestAppId(app)
    }

    public async getAppById(appId: string): Promise<IAppRegistryBase.AppStructOutput> {
        return this.registry.read.getAppById(appId)
    }

    public async adminRegisterAppSchema(
        signer: ethers.Signer,
        schema: string,
        resolver: Address,
        revocable: boolean,
    ): Promise<ContractTransaction> {
        return this.registry.write(signer).adminRegisterAppSchema(schema, resolver, revocable)
    }

    public async adminBanApp(signer: ethers.Signer, app: Address): Promise<ContractTransaction> {
        return this.registry.write(signer).adminBanApp(app)
    }

    public async getAllAppsByOwner(targetOwner: Address, fromBlock?: number) {
        const appCreatedEvents = await this.factory.read.queryFilter(
            this.factory.read.filters.AppCreated(),
            fromBlock,
        )

        const appRegisteredEvents = await this.registry.read.queryFilter(
            this.registry.read.filters.AppRegistered(),
            fromBlock,
        )

        const allAppIds = new Set([
            ...appCreatedEvents.map((event) => event.args.uid),
            ...appRegisteredEvents.map((event) => event.args.uid),
        ])

        const ownerApps: BotInfo[] = []
        for (const appId of allAppIds) {
            try {
                const app = await this.registry.read.getAppById(appId)
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
