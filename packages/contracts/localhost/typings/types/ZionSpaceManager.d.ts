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
    type CreateChannelDataStruct = {
        spaceNetworkId: PromiseOrValue<string>;
        channelName: PromiseOrValue<string>;
        channelNetworkId: PromiseOrValue<string>;
    };
    type CreateChannelDataStructOutput = [string, string, string] & {
        spaceNetworkId: string;
        channelName: string;
        channelNetworkId: string;
    };
    type CreateSpaceDataStruct = {
        spaceName: PromiseOrValue<string>;
        spaceNetworkId: PromiseOrValue<string>;
    };
    type CreateSpaceDataStructOutput = [string, string] & {
        spaceName: string;
        spaceNetworkId: string;
    };
    type CreateSpaceTokenEntitlementDataStruct = {
        tokenAddress: PromiseOrValue<string>;
        quantity: PromiseOrValue<BigNumberish>;
        description: PromiseOrValue<string>;
        isSingleToken: PromiseOrValue<boolean>;
        tokenId: PromiseOrValue<BigNumberish>;
        permissions: PromiseOrValue<string>[];
        roleName: PromiseOrValue<string>;
    };
    type CreateSpaceTokenEntitlementDataStructOutput = [
        string,
        BigNumber,
        string,
        boolean,
        BigNumber,
        string[],
        string
    ] & {
        tokenAddress: string;
        quantity: BigNumber;
        description: string;
        isSingleToken: boolean;
        tokenId: BigNumber;
        permissions: string[];
        roleName: string;
    };
    type ChannelInfoStruct = {
        channelId: PromiseOrValue<BigNumberish>;
        networkId: PromiseOrValue<string>;
        createdAt: PromiseOrValue<BigNumberish>;
        name: PromiseOrValue<string>;
        creator: PromiseOrValue<string>;
        disabled: PromiseOrValue<boolean>;
    };
    type ChannelInfoStructOutput = [
        BigNumber,
        string,
        BigNumber,
        string,
        string,
        boolean
    ] & {
        channelId: BigNumber;
        networkId: string;
        createdAt: BigNumber;
        name: string;
        creator: string;
        disabled: boolean;
    };
    type ChannelStruct = {
        channelId: PromiseOrValue<BigNumberish>;
        createdAt: PromiseOrValue<BigNumberish>;
        networkId: PromiseOrValue<string>;
        name: PromiseOrValue<string>;
        creator: PromiseOrValue<string>;
        disabled: PromiseOrValue<boolean>;
    };
    type ChannelStructOutput = [
        BigNumber,
        BigNumber,
        string,
        string,
        string,
        boolean
    ] & {
        channelId: BigNumber;
        createdAt: BigNumber;
        networkId: string;
        name: string;
        creator: string;
        disabled: boolean;
    };
    type ChannelsStruct = {
        idCounter: PromiseOrValue<BigNumberish>;
        channels: DataTypes.ChannelStruct[];
    };
    type ChannelsStructOutput = [
        BigNumber,
        DataTypes.ChannelStructOutput[]
    ] & {
        idCounter: BigNumber;
        channels: DataTypes.ChannelStructOutput[];
    };
    type EntitlementModuleInfoStruct = {
        addr: PromiseOrValue<string>;
        name: PromiseOrValue<string>;
        description: PromiseOrValue<string>;
    };
    type EntitlementModuleInfoStructOutput = [string, string, string] & {
        addr: string;
        name: string;
        description: string;
    };
    type RoleStruct = {
        roleId: PromiseOrValue<BigNumberish>;
        name: PromiseOrValue<string>;
    };
    type RoleStructOutput = [BigNumber, string] & {
        roleId: BigNumber;
        name: string;
    };
    type SpaceInfoStruct = {
        spaceId: PromiseOrValue<BigNumberish>;
        networkId: PromiseOrValue<string>;
        createdAt: PromiseOrValue<BigNumberish>;
        name: PromiseOrValue<string>;
        creator: PromiseOrValue<string>;
        owner: PromiseOrValue<string>;
        disabled: PromiseOrValue<boolean>;
    };
    type SpaceInfoStructOutput = [
        BigNumber,
        string,
        BigNumber,
        string,
        string,
        string,
        boolean
    ] & {
        spaceId: BigNumber;
        networkId: string;
        createdAt: BigNumber;
        name: string;
        creator: string;
        owner: string;
        disabled: boolean;
    };
}
export interface ZionSpaceManagerInterface extends utils.Interface {
    functions: {
        "addPermissionToRole(string,uint256,(string))": FunctionFragment;
        "addRoleToEntitlementModule(string,string,address,uint256,bytes)": FunctionFragment;
        "createChannel((string,string,string))": FunctionFragment;
        "createRole(string,string)": FunctionFragment;
        "createSpace((string,string))": FunctionFragment;
        "createSpaceWithTokenEntitlement((string,string),(address,uint256,string,bool,uint256,string[],string))": FunctionFragment;
        "getChannelIdByNetworkId(string,string)": FunctionFragment;
        "getChannelInfoByChannelId(string,string)": FunctionFragment;
        "getChannelsBySpaceId(string)": FunctionFragment;
        "getEntitlementModulesBySpaceId(string)": FunctionFragment;
        "getEntitlementsInfoBySpaceId(string)": FunctionFragment;
        "getPermissionFromMap(bytes32)": FunctionFragment;
        "getPermissionsBySpaceIdByRoleId(string,uint256)": FunctionFragment;
        "getRoleBySpaceIdByRoleId(string,uint256)": FunctionFragment;
        "getRolesBySpaceId(string)": FunctionFragment;
        "getSpaceIdByNetworkId(string)": FunctionFragment;
        "getSpaceInfoBySpaceId(string)": FunctionFragment;
        "getSpaceOwnerBySpaceId(string)": FunctionFragment;
        "getSpaces()": FunctionFragment;
        "isEntitled(string,string,address,(string))": FunctionFragment;
        "isEntitlementModuleWhitelisted(string,address)": FunctionFragment;
        "owner()": FunctionFragment;
        "removeEntitlement(string,string,address,uint256[],bytes)": FunctionFragment;
        "removePermissionFromRole(string,uint256,(string))": FunctionFragment;
        "removeRole(string,uint256)": FunctionFragment;
        "renounceOwnership()": FunctionFragment;
        "setChannelAccess(string,string,bool)": FunctionFragment;
        "setDefaultTokenEntitlementModule(address)": FunctionFragment;
        "setDefaultUserEntitlementModule(address)": FunctionFragment;
        "setSpaceAccess(string,bool)": FunctionFragment;
        "setSpaceNFT(address)": FunctionFragment;
        "transferOwnership(address)": FunctionFragment;
        "whitelistEntitlementModule(string,address,bool)": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "addPermissionToRole" | "addRoleToEntitlementModule" | "createChannel" | "createRole" | "createSpace" | "createSpaceWithTokenEntitlement" | "getChannelIdByNetworkId" | "getChannelInfoByChannelId" | "getChannelsBySpaceId" | "getEntitlementModulesBySpaceId" | "getEntitlementsInfoBySpaceId" | "getPermissionFromMap" | "getPermissionsBySpaceIdByRoleId" | "getRoleBySpaceIdByRoleId" | "getRolesBySpaceId" | "getSpaceIdByNetworkId" | "getSpaceInfoBySpaceId" | "getSpaceOwnerBySpaceId" | "getSpaces" | "isEntitled" | "isEntitlementModuleWhitelisted" | "owner" | "removeEntitlement" | "removePermissionFromRole" | "removeRole" | "renounceOwnership" | "setChannelAccess" | "setDefaultTokenEntitlementModule" | "setDefaultUserEntitlementModule" | "setSpaceAccess" | "setSpaceNFT" | "transferOwnership" | "whitelistEntitlementModule"): FunctionFragment;
    encodeFunctionData(functionFragment: "addPermissionToRole", values: [
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>,
        DataTypes.PermissionStruct
    ]): string;
    encodeFunctionData(functionFragment: "addRoleToEntitlementModule", values: [
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BytesLike>
    ]): string;
    encodeFunctionData(functionFragment: "createChannel", values: [DataTypes.CreateChannelDataStruct]): string;
    encodeFunctionData(functionFragment: "createRole", values: [PromiseOrValue<string>, PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "createSpace", values: [DataTypes.CreateSpaceDataStruct]): string;
    encodeFunctionData(functionFragment: "createSpaceWithTokenEntitlement", values: [
        DataTypes.CreateSpaceDataStruct,
        DataTypes.CreateSpaceTokenEntitlementDataStruct
    ]): string;
    encodeFunctionData(functionFragment: "getChannelIdByNetworkId", values: [PromiseOrValue<string>, PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getChannelInfoByChannelId", values: [PromiseOrValue<string>, PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getChannelsBySpaceId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getEntitlementModulesBySpaceId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getEntitlementsInfoBySpaceId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getPermissionFromMap", values: [PromiseOrValue<BytesLike>]): string;
    encodeFunctionData(functionFragment: "getPermissionsBySpaceIdByRoleId", values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getRoleBySpaceIdByRoleId", values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getRolesBySpaceId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getSpaceIdByNetworkId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getSpaceInfoBySpaceId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getSpaceOwnerBySpaceId", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "getSpaces", values?: undefined): string;
    encodeFunctionData(functionFragment: "isEntitled", values: [
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        DataTypes.PermissionStruct
    ]): string;
    encodeFunctionData(functionFragment: "isEntitlementModuleWhitelisted", values: [PromiseOrValue<string>, PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "owner", values?: undefined): string;
    encodeFunctionData(functionFragment: "removeEntitlement", values: [
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>[],
        PromiseOrValue<BytesLike>
    ]): string;
    encodeFunctionData(functionFragment: "removePermissionFromRole", values: [
        PromiseOrValue<string>,
        PromiseOrValue<BigNumberish>,
        DataTypes.PermissionStruct
    ]): string;
    encodeFunctionData(functionFragment: "removeRole", values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "renounceOwnership", values?: undefined): string;
    encodeFunctionData(functionFragment: "setChannelAccess", values: [
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<boolean>
    ]): string;
    encodeFunctionData(functionFragment: "setDefaultTokenEntitlementModule", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "setDefaultUserEntitlementModule", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "setSpaceAccess", values: [PromiseOrValue<string>, PromiseOrValue<boolean>]): string;
    encodeFunctionData(functionFragment: "setSpaceNFT", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "transferOwnership", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "whitelistEntitlementModule", values: [
        PromiseOrValue<string>,
        PromiseOrValue<string>,
        PromiseOrValue<boolean>
    ]): string;
    decodeFunctionResult(functionFragment: "addPermissionToRole", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addRoleToEntitlementModule", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createChannel", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createRole", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpace", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpaceWithTokenEntitlement", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getChannelIdByNetworkId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getChannelInfoByChannelId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getChannelsBySpaceId", data: BytesLike): Result;
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
    decodeFunctionResult(functionFragment: "removeEntitlement", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "removePermissionFromRole", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "removeRole", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "renounceOwnership", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setChannelAccess", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setDefaultTokenEntitlementModule", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setDefaultUserEntitlementModule", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setSpaceAccess", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setSpaceNFT", data: BytesLike): Result;
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
        addPermissionToRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createChannel(data: DataTypes.CreateChannelDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createRole(spaceId: PromiseOrValue<string>, name: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        getChannelIdByNetworkId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;
        getChannelInfoByChannelId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[DataTypes.ChannelInfoStructOutput]>;
        getChannelsBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[DataTypes.ChannelsStructOutput]>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[string[]] & {
            entitlementModules: string[];
        }>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[DataTypes.EntitlementModuleInfoStructOutput[]]>;
        getPermissionFromMap(permissionType: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<[
            DataTypes.PermissionStructOutput
        ] & {
            permission: DataTypes.PermissionStructOutput;
        }>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.PermissionStructOutput[]]>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.RoleStructOutput]>;
        getRolesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[DataTypes.RoleStructOutput[]]>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;
        getSpaceInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput]>;
        getSpaceOwnerBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[string] & {
            ownerAddress: string;
        }>;
        getSpaces(overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput[]]>;
        isEntitled(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<[boolean]>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;
        owner(overrides?: CallOverrides): Promise<[string]>;
        removeEntitlement(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        removePermissionFromRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        removeRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        setChannelAccess(spaceNetworkId: PromiseOrValue<string>, channelNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        setDefaultTokenEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        setDefaultUserEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        setSpaceAccess(spaceNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        setSpaceNFT(spaceNFTAddress: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<string>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
    };
    addPermissionToRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    addRoleToEntitlementModule(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createChannel(data: DataTypes.CreateChannelDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createRole(spaceId: PromiseOrValue<string>, name: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    getChannelIdByNetworkId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
    getChannelInfoByChannelId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.ChannelInfoStructOutput>;
    getChannelsBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.ChannelsStructOutput>;
    getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<string[]>;
    getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.EntitlementModuleInfoStructOutput[]>;
    getPermissionFromMap(permissionType: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput>;
    getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput[]>;
    getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput>;
    getRolesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput[]>;
    getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
    getSpaceInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
    getSpaceOwnerBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<string>;
    getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
    isEntitled(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<boolean>;
    isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
    owner(overrides?: CallOverrides): Promise<string>;
    removeEntitlement(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    removePermissionFromRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    removeRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    renounceOwnership(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    setChannelAccess(spaceNetworkId: PromiseOrValue<string>, channelNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    setDefaultTokenEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    setDefaultUserEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    setSpaceAccess(spaceNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    setSpaceNFT(spaceNFTAddress: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    whitelistEntitlementModule(spaceId: PromiseOrValue<string>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    callStatic: {
        addPermissionToRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<void>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<void>;
        createChannel(data: DataTypes.CreateChannelDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        createRole(spaceId: PromiseOrValue<string>, name: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        getChannelIdByNetworkId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getChannelInfoByChannelId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.ChannelInfoStructOutput>;
        getChannelsBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.ChannelsStructOutput>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<string[]>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.EntitlementModuleInfoStructOutput[]>;
        getPermissionFromMap(permissionType: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.PermissionStructOutput[]>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput>;
        getRolesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.RoleStructOutput[]>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
        getSpaceOwnerBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<string>;
        getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
        isEntitled(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<boolean>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
        owner(overrides?: CallOverrides): Promise<string>;
        removeEntitlement(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<void>;
        removePermissionFromRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<void>;
        removeRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<void>;
        renounceOwnership(overrides?: CallOverrides): Promise<void>;
        setChannelAccess(spaceNetworkId: PromiseOrValue<string>, channelNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<void>;
        setDefaultTokenEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        setDefaultUserEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        setSpaceAccess(spaceNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<void>;
        setSpaceNFT(spaceNFTAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<string>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: CallOverrides): Promise<void>;
    };
    filters: {
        "OwnershipTransferred(address,address)"(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
        OwnershipTransferred(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
    };
    estimateGas: {
        addPermissionToRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createChannel(data: DataTypes.CreateChannelDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createRole(spaceId: PromiseOrValue<string>, name: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        getChannelIdByNetworkId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getChannelInfoByChannelId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getChannelsBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getPermissionFromMap(permissionType: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<BigNumber>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getRolesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceOwnerBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaces(overrides?: CallOverrides): Promise<BigNumber>;
        isEntitled(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<BigNumber>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        owner(overrides?: CallOverrides): Promise<BigNumber>;
        removeEntitlement(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        removePermissionFromRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        removeRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        setChannelAccess(spaceNetworkId: PromiseOrValue<string>, channelNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        setDefaultTokenEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        setDefaultUserEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        setSpaceAccess(spaceNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        setSpaceNFT(spaceNFTAddress: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<string>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
    };
    populateTransaction: {
        addPermissionToRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        addRoleToEntitlementModule(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, entitlementData: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createChannel(data: DataTypes.CreateChannelDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createRole(spaceId: PromiseOrValue<string>, name: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpace(info: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpaceWithTokenEntitlement(info: DataTypes.CreateSpaceDataStruct, entitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        getChannelIdByNetworkId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getChannelInfoByChannelId(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getChannelsBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getEntitlementModulesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getEntitlementsInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getPermissionFromMap(permissionType: PromiseOrValue<BytesLike>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getPermissionsBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getRoleBySpaceIdByRoleId(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getRolesBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceIdByNetworkId(networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceInfoBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceOwnerBySpaceId(spaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaces(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitled(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, user: PromiseOrValue<string>, permission: DataTypes.PermissionStruct, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitlementModuleWhitelisted(spaceId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        removeEntitlement(spaceId: PromiseOrValue<string>, channelId: PromiseOrValue<string>, entitlementModuleAddress: PromiseOrValue<string>, roleIds: PromiseOrValue<BigNumberish>[], data: PromiseOrValue<BytesLike>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        removePermissionFromRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, permission: DataTypes.PermissionStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        removeRole(spaceId: PromiseOrValue<string>, roleId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        setChannelAccess(spaceNetworkId: PromiseOrValue<string>, channelNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        setDefaultTokenEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        setDefaultUserEntitlementModule(entitlementModule: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        setSpaceAccess(spaceNetworkId: PromiseOrValue<string>, disabled: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        setSpaceNFT(spaceNFTAddress: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        whitelistEntitlementModule(spaceId: PromiseOrValue<string>, entitlementAddress: PromiseOrValue<string>, whitelist: PromiseOrValue<boolean>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
    };
}
//# sourceMappingURL=ZionSpaceManager.d.ts.map