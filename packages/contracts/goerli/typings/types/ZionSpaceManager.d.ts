import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "./common";
export declare namespace DataTypes {
    type PermissionStruct = {
        name: PromiseOrValue<string>;
    };
    type PermissionStructOutput = [string] & {
        name: string;
    };
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
        permissions: PromiseOrValue<string>[];
    };
    type CreateSpaceTokenEntitlementDataStructOutput = [
        string,
        string,
        BigNumber,
        string,
        string[]
    ] & {
        entitlementModuleAddress: string;
        tokenAddress: string;
        quantity: BigNumber;
        description: string;
        permissions: string[];
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
    type RoleStruct = {
        roleId: PromiseOrValue<BigNumberish>;
        name: PromiseOrValue<string>;
        color: PromiseOrValue<BytesLike>;
        isTransitive: PromiseOrValue<boolean>;
    };
    type RoleStructOutput = [BigNumber, string, string, boolean] & {
        roleId: BigNumber;
        name: string;
        color: string;
        isTransitive: boolean;
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
        "addPermissionToRole(uint256,uint256,(string))": FunctionFragment;
        "addRoleToEntitlementModule(uint256,address,uint256,bytes)": FunctionFragment;
        "createRole(uint256,string,bytes8)": FunctionFragment;
        "createSpace((string,string))": FunctionFragment;
        "createSpaceWithTokenEntitlement((string,string),(address,address,uint256,string,string[]))": FunctionFragment;
        "getEntitlementModulesBySpaceId(uint256)": FunctionFragment;
        "getEntitlementsInfoBySpaceId(uint256)": FunctionFragment;
        "getPermissionFromMap(uint8)": FunctionFragment;
        "getPermissionsBySpaceIdByRoleId(uint256,uint256)": FunctionFragment;
        "getRoleBySpaceIdByRoleId(uint256,uint256)": FunctionFragment;
        "getRolesBySpaceId(uint256)": FunctionFragment;
        "getSpaceIdByNetworkId(string)": FunctionFragment;
        "getSpaceInfoBySpaceId(uint256)": FunctionFragment;
        "getSpaceOwnerBySpaceId(uint256)": FunctionFragment;
        "getSpaces()": FunctionFragment;
        "isEntitled(uint256,uint256,address,(string))": FunctionFragment;
        "isEntitlementModuleWhitelisted(uint256,address)": FunctionFragment;
        "owner()": FunctionFragment;
        "registerDefaultEntitlementModule(address)": FunctionFragment;
        "removeEntitlement(uint256,address,uint256[],bytes)": FunctionFragment;
        "renounceOwnership()": FunctionFragment;
        "transferOwnership(address)": FunctionFragment;
        "whitelistEntitlementModule(uint256,address,bool)": FunctionFragment;
        "zionPermissionsMap(uint8)": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "addPermissionToRole" | "addRoleToEntitlementModule" | "createRole" | "createSpace" | "createSpaceWithTokenEntitlement" | "getEntitlementModulesBySpaceId" | "getEntitlementsInfoBySpaceId" | "getPermissionFromMap" | "getPermissionsBySpaceIdByRoleId" | "getRoleBySpaceIdByRoleId" | "getRolesBySpaceId" | "getSpaceIdByNetworkId" | "getSpaceInfoBySpaceId" | "getSpaceOwnerBySpaceId" | "getSpaces" | "isEntitled" | "isEntitlementModuleWhitelisted" | "owner" | "registerDefaultEntitlementModule" | "removeEntitlement" | "renounceOwnership" | "transferOwnership" | "whitelistEntitlementModule" | "zionPermissionsMap"): FunctionFragment;
    encodeFunctionData(functionFragment: "addPermissionToRole", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BigNumberish>,
        DataTypes.PermissionStruct
    ]): string;
    encodeFunctionData(functionFragment: "addRoleToEntitlementModule", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BytesLike>
    ]): string;
    encodeFunctionData(functionFragment: "createRole", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<BytesLike>
    ]): string;
    encodeFunctionData(functionFragment: "createSpace", values: [DataTypes.CreateSpaceDataStruct]): string;
    encodeFunctionData(functionFragment: "createSpaceWithTokenEntitlement", values: [
        DataTypes.CreateSpaceDataStruct,
        DataTypes.CreateSpaceTokenEntitlementDataStruct
    ]): string;
    encodeFunctionData(functionFragment: "getEntitlementModulesBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getEntitlementsInfoBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getPermissionFromMap", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getPermissionsBySpaceIdByRoleId", values: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getRoleBySpaceIdByRoleId", values: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getRolesBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceIdByNetworkId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getSpaceInfoBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceOwnerBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaces", values?: undefined): string;
    encodeFunctionData(functionFragment: "isEntitled", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        DataTypes.PermissionStruct
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
    encodeFunctionData(functionFragment: "zionPermissionsMap", values: [PromiseOrValue<BigNumberish>]): string;
    decodeFunctionResult(functionFragment: "addPermissionToRole", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addRoleToEntitlementModule", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createRole", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpace", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpaceWithTokenEntitlement", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getEntitlementModulesBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getEntitlementsInfoBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getPermissionFromMap", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getPermissionsBySpaceIdByRoleId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getRoleBySpaceIdByRoleId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getRolesBySpaceId", data: BytesLike): Result;
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
    decodeFunctionResult(functionFragment: "zionPermissionsMap", data: BytesLike): Result;
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
        addPermissionToRole(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createRole(spaceId: PromiseOrValue<BigNumberish>, name: PromiseOrValue<string>, color: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string[]] & {
            entitlementModules: string[];
        }>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.EntitlementModuleInfoStructOutput[]]>;
        getPermissionFromMap(zionPermission: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
            DataTypes.PermissionStructOutput
        ] & {
            permission: DataTypes.PermissionStructOutput;
        }>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.PermissionStructOutput[]]>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.RoleStructOutput]>;
        getRolesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.RoleStructOutput[]]>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput]>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string] & {
            ownerAddress: string;
        }>;
        getSpaces(overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput[]]>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<[boolean]>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;
        owner(overrides?: CallOverrides): Promise<[string]>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
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
        zionPermissionsMap(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string] & {
            name: string;
        }>;
    };
    addPermissionToRole(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    addRoleToEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createRole(spaceId: PromiseOrValue<BigNumberish>, name: PromiseOrValue<string>, color: PromiseOrValue<BytesLike>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
    getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.EntitlementModuleInfoStructOutput[]>;
    getPermissionFromMap(zionPermission: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput>;
    getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput[]>;
    getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput>;
    getRolesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput[]>;
    getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
    getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
    getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
    getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
    isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<boolean>;
    isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
    owner(overrides?: CallOverrides): Promise<string>;
    registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
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
    zionPermissionsMap(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
    callStatic: {
        addPermissionToRole(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<void>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<void>;
        createRole(spaceId: PromiseOrValue<BigNumberish>, name: PromiseOrValue<string>, color: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.EntitlementModuleInfoStructOutput[]>;
        getPermissionFromMap(zionPermission: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput[]>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput>;
        getRolesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput[]>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
        getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<boolean>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
        owner(overrides?: CallOverrides): Promise<string>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<void>;
        renounceOwnership(overrides?: CallOverrides): Promise<void>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<void>;
        zionPermissionsMap(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
    };
    filters: {
        "OwnershipTransferred(address,address)"(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
        OwnershipTransferred(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
    };
    estimateGas: {
        addPermissionToRole(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createRole(spaceId: PromiseOrValue<BigNumberish>, name: PromiseOrValue<string>, color: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getPermissionFromMap(zionPermission: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getRolesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaces(overrides?: CallOverrides): Promise<BigNumber>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<BigNumber>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        owner(overrides?: CallOverrides): Promise<BigNumber>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
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
        zionPermissionsMap(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        addPermissionToRole(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createRole(spaceId: PromiseOrValue<BigNumberish>, name: PromiseOrValue<string>, color: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getPermissionFromMap(zionPermission: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<BigNumberish>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getRolesBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaces(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        registerDefaultEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        removeEntitlement(spaceId: PromiseOrValue<BigNumberish>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
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
        zionPermissionsMap(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
//# sourceMappingURL=ZionSpaceManager.d.ts.map