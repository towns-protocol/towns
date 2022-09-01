import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "../../../../common";
export declare namespace DataTypes {
    type AddEntitlementDataStruct = {
        spaceId: PromiseOrValue<BigNumberish>;
        entitlement: PromiseOrValue<string>;
        entitlementTag: PromiseOrValue<string>;
    };
    type AddEntitlementDataStructOutput = [BigNumber, string, string] & {
        spaceId: BigNumber;
        entitlement: string;
        entitlementTag: string;
    };
    type CreateSpaceDataStruct = {
        spaceName: PromiseOrValue<string>;
        entitlements: PromiseOrValue<string>[];
    };
    type CreateSpaceDataStructOutput = [string, string[]] & {
        spaceName: string;
        entitlements: string[];
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
        "addEntitlementModule((uint256,address,string))": FunctionFragment;
        "createSpace((string,address[]))": FunctionFragment;
        "getEntitlementsBySpaceId(uint256)": FunctionFragment;
        "getSpaceIdByNetworkId(string)": FunctionFragment;
        "getSpaceInfoBySpaceId(uint256)": FunctionFragment;
        "getSpaceOwnerBySpaceId(uint256)": FunctionFragment;
        "getSpaces()": FunctionFragment;
        "isEntitled(uint256,uint256,address,uint8)": FunctionFragment;
        "owner()": FunctionFragment;
        "renounceOwnership()": FunctionFragment;
        "setNetworkIdToSpaceId(uint256,string)": FunctionFragment;
        "transferOwnership(address)": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "addEntitlementModule" | "createSpace" | "getEntitlementsBySpaceId" | "getSpaceIdByNetworkId" | "getSpaceInfoBySpaceId" | "getSpaceOwnerBySpaceId" | "getSpaces" | "isEntitled" | "owner" | "renounceOwnership" | "setNetworkIdToSpaceId" | "transferOwnership"): FunctionFragment;
    encodeFunctionData(functionFragment: "addEntitlementModule", values: [DataTypes.AddEntitlementDataStruct]): string;
    encodeFunctionData(functionFragment: "createSpace", values: [DataTypes.CreateSpaceDataStruct]): string;
    encodeFunctionData(functionFragment: "getEntitlementsBySpaceId", values: [PromiseOrValue<BigNumberish>]): string;
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
    encodeFunctionData(functionFragment: "owner", values?: undefined): string;
    encodeFunctionData(functionFragment: "renounceOwnership", values?: undefined): string;
    encodeFunctionData(functionFragment: "setNetworkIdToSpaceId", values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "transferOwnership", values: [PromiseOrValue<string>]): string;
    decodeFunctionResult(functionFragment: "addEntitlementModule", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpace", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getEntitlementsBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceIdByNetworkId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceInfoBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceOwnerBySpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaces", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isEntitled", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "renounceOwnership", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setNetworkIdToSpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transferOwnership", data: BytesLike): Result;
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
        addEntitlementModule(vars: DataTypes.AddEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpace(vars: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string[]] & {
            entitlements: string[];
        }>;
        getSpaceIdByNetworkId(networkSpaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[BigNumber]>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput]>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string] & {
            ownerAddress: string;
        }>;
        getSpaces(overrides?: CallOverrides): Promise<[DataTypes.SpaceInfoStructOutput[]]>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[boolean]>;
        owner(overrides?: CallOverrides): Promise<[string]>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        setNetworkIdToSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkId: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
    };
    addEntitlementModule(vars: DataTypes.AddEntitlementDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpace(vars: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
    getSpaceIdByNetworkId(networkSpaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
    getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
    getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
    getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
    isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<boolean>;
    owner(overrides?: CallOverrides): Promise<string>;
    renounceOwnership(overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    setNetworkIdToSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkId: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    callStatic: {
        addEntitlementModule(vars: DataTypes.AddEntitlementDataStruct, overrides?: CallOverrides): Promise<void>;
        createSpace(vars: DataTypes.CreateSpaceDataStruct, overrides?: CallOverrides): Promise<BigNumber>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
        getSpaceIdByNetworkId(networkSpaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
        getSpaces(overrides?: CallOverrides): Promise<DataTypes.SpaceInfoStructOutput[]>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<boolean>;
        owner(overrides?: CallOverrides): Promise<string>;
        renounceOwnership(overrides?: CallOverrides): Promise<void>;
        setNetworkIdToSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
    };
    filters: {
        "OwnershipTransferred(address,address)"(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
        OwnershipTransferred(previousOwner?: PromiseOrValue<string> | null, newOwner?: PromiseOrValue<string> | null): OwnershipTransferredEventFilter;
    };
    estimateGas: {
        addEntitlementModule(vars: DataTypes.AddEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpace(vars: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceIdByNetworkId(networkSpaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaces(overrides?: CallOverrides): Promise<BigNumber>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        owner(overrides?: CallOverrides): Promise<BigNumber>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        setNetworkIdToSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkId: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
    };
    populateTransaction: {
        addEntitlementModule(vars: DataTypes.AddEntitlementDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpace(vars: DataTypes.CreateSpaceDataStruct, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        getEntitlementsBySpaceId(spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceIdByNetworkId(networkSpaceId: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceInfoBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceOwnerBySpaceId(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaces(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, user: PromiseOrValue<string>, entitlementType: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        renounceOwnership(overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        setNetworkIdToSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkId: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        transferOwnership(newOwner: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
    };
}
//# sourceMappingURL=ZionSpaceManager.d.ts.map