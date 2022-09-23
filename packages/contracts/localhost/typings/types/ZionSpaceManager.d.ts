import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "./common";
export declare namespace DataTypes {
    type CreateSpaceDataStruct = {
        spaceName: PromiseOrValue<string>;
        networkId: PromiseOrValue<string>;
    };
    type CreateSpaceDataStructOutput = [string, string] & {
        spaceName: string;
        networkId: string;
    };
    type CreateSpaceTokenEntitlementDataStruct = {
        entitlementModuleAddress: PromiseOrValue<string>;
        tokenAddress: PromiseOrValue<string>;
        quantity: PromiseOrValue<BigNumberish>;
        description: PromiseOrValue<string>;
        entitlementTypes: PromiseOrValue<BigNumberish>[];
    };
    type CreateSpaceTokenEntitlementDataStructOutput = [
        string,
        string,
        BigNumber,
        string,
        number[]
    ] & {
        entitlementModuleAddress: string;
        tokenAddress: string;
        quantity: BigNumber;
        description: string;
        entitlementTypes: number[];
    };
    type EntitlementModuleInfoStruct = {
        entitlementAddress: PromiseOrValue<string>;
        entitlementName: PromiseOrValue<string>;
        entitlementDescription: PromiseOrValue<string>;
    };
    type EntitlementModuleInfoStructOutput = [string, string, string] & {
        entitlementAddress: string;
        entitlementName: string;
        entitlementDescription: string;
    };
    type SpaceInfoStruct = {
        spaceId: PromiseOrValue<BigNumberish>;
        createdAt: PromiseOrValue<BigNumberish>;
        name: PromiseOrValue<string>;
        creator: PromiseOrValue<string>;
        owner: PromiseOrValue<string>;
    };
    type SpaceInfoStructOutput = [
        BigNumber,
        BigNumber,
        string,
        string,
        string
    ] & {
        spaceId: BigNumber;
        createdAt: BigNumber;
        name: string;
        creator: string;
        owner: string;
    };
}
export interface ZionSpaceManagerInterface extends utils.Interface {
    functions: {
        "addEntitlement(uint256,address,uint8[],bytes)": FunctionFragment;
        "createSpace((string,string))": FunctionFragment;
        "createSpaceWithTokenEntitlement((string,string),(address,address,uint256,string,uint8[]))": FunctionFragment;
        "getEntitlementsBySpaceId(uint256)": FunctionFragment;
        "getEntitlementsInfoBySpaceId(uint256)": FunctionFragment;
        "getSpaceIdByNetworkId(string)": FunctionFragment;
        "getSpaceInfoBySpaceId(uint256)": FunctionFragment;
        "getSpaceOwnerBySpaceId(uint256)": FunctionFragment;
        "getSpaces()": FunctionFragment;
        "isEntitled(uint256,uint256,address,uint8)": FunctionFragment;
        "isEntitlementModuleWhitelisted(uint256,address)": FunctionFragment;
        "owner()": FunctionFragment;
        "registerDefaultEntitlementModule(address)": FunctionFragment;
        "removeEntitlement(uint256,address,uint8[],bytes)": FunctionFragment;
        "renounceOwnership()": FunctionFragment;
        "transferOwnership(address)": FunctionFragment;
        "whitelistEntitlementModule(uint256,address,bool)": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "addEntitlement" | "createSpace" | "createSpaceWithTokenEntitlement" | "getEntitlementsBySpaceId" | "getEntitlementsInfoBySpaceId" | "getSpaceIdByNetworkId" | "getSpaceInfoBySpaceId" | "getSpaceOwnerBySpaceId" | "getSpaces" | "isEntitled" | "isEntitlementModuleWhitelisted" | "owner" | "registerDefaultEntitlementModule" | "removeEntitlement" | "renounceOwnership" | "transferOwnership" | "whitelistEntitlementModule"): FunctionFragment;
    encodeFunctionData(functionFragment: "addEntitlement", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>[],
        PromiseOrValue<BytesLike>
    ]): string;
    encodeFunctionData(functionFragment: "createSpace", values: [DataTypes.CreateSpaceDataStruct]): string;
    encodeFunctionData(functionFragment: "createSpaceWithTokenEntitlement", values: [
        DataTypes.CreateSpaceDataStruct,
        DataTypes.CreateSpaceTokenEntitlementDataStruct
    ]): string;
    encodeFunctionData(functionFragment: "getEntitlementsBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getEntitlementsInfoBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceIdByNetworkId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getSpaceInfoBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceOwnerBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaces", values?: undefined): string;
    encodeFunctionData(functionFragment: "isEntitled", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>
    ]): string;
    encodeFunctionData(functionFragment: "isEntitlementModuleWhitelisted", values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "owner", values?: undefined): string;
    encodeFunctionData(functionFragment: "registerDefaultEntitlementModule", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "removeEntitlement", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>[],
        PromiseOrValue<BytesLike>
    ]): string;
    encodeFunctionData(functionFragment: "renounceOwnership", values?: undefined): string;
    encodeFunctionData(functionFragment: "transferOwnership", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "whitelistEntitlementModule", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<boolean>
    ]): string;
    decodeFunctionResult(functionFragment: "addEntitlement", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpace", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpaceWithTokenEntitlement", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getEntitlementsBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getEntitlementsInfoBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceIdByNetworkId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceInfoBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceOwnerBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaces", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isEntitled", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isEntitlementModuleWhitelisted", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "registerDefaultEntitlementModule", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "removeEntitlement", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "renounceOwnership", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transferOwnership", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "whitelistEntitlementModule", data: BytesLike): Result;
    events: {
        "OwnershipTransferred(address,address)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
}
export interface OwnershipTransferredEventObject {
    previousOwner: string;
    newOwner: string;
}
export declare type OwnershipTransferredEvent = TypedEvent<[
    string,
    string
], OwnershipTransferredEventObject>;
export declare type OwnershipTransferredEventFilter = TypedEventFilter<OwnershipTransferredEvent>;
export interface ZionSpaceManager extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: ZionSpaceManagerInterface;
    queryFilter<TEvent extends TypedEvent>(event: TypedEventFilter<TEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TEvent>>;
    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;
    functions: {
        addEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string[]] & {
            entitlements: string[];
        }>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.EntitlementModuleInfoStructOutput[]]>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput]>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string] & {
            ownerAddress: string;
        }>;
        getSpaces(overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput[]]>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[boolean]>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;
        owner(overrides?: CallOverrides): Promise<[string]>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
    };
    addEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
    getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.EntitlementModuleInfoStructOutput[]>;
    getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
    getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
    getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
    getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
    isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<boolean>;
    isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
    owner(overrides?: CallOverrides): Promise<string>;
    registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    renounceOwnership(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    whitelistEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    callStatic: {
        addEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], entitlementData: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<void>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.EntitlementModuleInfoStructOutput[]>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
        getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<boolean>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
        owner(overrides?: CallOverrides): Promise<string>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<void>;
        renounceOwnership(overrides?: CallOverrides): Promise<void>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<void>;
    };
    filters: {
        "OwnershipTransferred(address,address)"(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
        OwnershipTransferred(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
    };
    estimateGas: {
        addEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaces(overrides?: CallOverrides): Promise<BigNumber>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        owner(overrides?: CallOverrides): Promise<BigNumber>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
    };
    populateTransaction: {
        addEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaces(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, entitlementTypes: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
    };
}
//# sourceMappingURL=ZionSpaceManager.d.ts.map