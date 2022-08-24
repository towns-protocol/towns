import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent, PromiseOrValue } from "../../../../common";
export declare namespace ZionSpaceManager {
    type SpaceNameIDStruct = {
        name: PromiseOrValue<string>;
        id: PromiseOrValue<BigNumberish>;
    };
    type SpaceNameIDStructOutput = [string, BigNumber] & {
        name: string;
        id: BigNumber;
    };
}
export interface ZionSpaceManagerInterface extends utils.Interface {
    functions: {
        "addEntitlementModuleAddress(uint256,address,string)": FunctionFragment;
        "createSpace(string,address[])": FunctionFragment;
        "getSpaceEntitlementModuleAddresses(uint256)": FunctionFragment;
        "getSpaceIdFromNetworkSpaceId(uint256)": FunctionFragment;
        "getSpaceNames()": FunctionFragment;
        "getSpaceOwner(uint256)": FunctionFragment;
        "getSpaceValues(uint256)": FunctionFragment;
        "isEntitled(uint256,uint256,uint8,address)": FunctionFragment;
        "networkSpaceIdToSpaceId(uint256)": FunctionFragment;
        "registeredSpaceNames(string)": FunctionFragment;
        "setNetworkSpaceId(uint256,uint256)": FunctionFragment;
        "spaces(uint256)": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "addEntitlementModuleAddress" | "createSpace" | "getSpaceEntitlementModuleAddresses" | "getSpaceIdFromNetworkSpaceId" | "getSpaceNames" | "getSpaceOwner" | "getSpaceValues" | "isEntitled" | "networkSpaceIdToSpaceId" | "registeredSpaceNames" | "setNetworkSpaceId" | "spaces"): FunctionFragment;
    encodeFunctionData(functionFragment: "addEntitlementModuleAddress", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>,
        PromiseOrValue<string>
    ]): string;
    encodeFunctionData(functionFragment: "createSpace", values: [PromiseOrValue<string>, PromiseOrValue<string>[]]): string;
    encodeFunctionData(functionFragment: "getSpaceEntitlementModuleAddresses", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceIdFromNetworkSpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceNames", values?: undefined): string;
    encodeFunctionData(functionFragment: "getSpaceOwner", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "getSpaceValues", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "isEntitled", values: [
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<BigNumberish>,
        PromiseOrValue<string>
    ]): string;
    encodeFunctionData(functionFragment: "networkSpaceIdToSpaceId", values: [PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "registeredSpaceNames", values: [PromiseOrValue<string>]): string;
    encodeFunctionData(functionFragment: "setNetworkSpaceId", values: [PromiseOrValue<BigNumberish>, PromiseOrValue<BigNumberish>]): string;
    encodeFunctionData(functionFragment: "spaces", values: [PromiseOrValue<BigNumberish>]): string;
    decodeFunctionResult(functionFragment: "addEntitlementModuleAddress", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createSpace", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceEntitlementModuleAddresses", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceIdFromNetworkSpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceNames", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceOwner", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getSpaceValues", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "isEntitled", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "networkSpaceIdToSpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "registeredSpaceNames", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "setNetworkSpaceId", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "spaces", data: BytesLike): Result;
    events: {
        "CreateSpace(address,string)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "CreateSpace"): EventFragment;
}
export interface CreateSpaceEventObject {
    owner: string;
    spaceName: string;
}
export declare type CreateSpaceEvent = TypedEvent<[
    string,
    string
], CreateSpaceEventObject>;
export declare type CreateSpaceEventFilter = TypedEventFilter<CreateSpaceEvent>;
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
        addEntitlementModuleAddress(spaceId: PromiseOrValue<BigNumberish>, _entitlementModuleAddress: PromiseOrValue<string>, tag: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        createSpace(spaceName: PromiseOrValue<string>, entitlementModuleAddresses: PromiseOrValue<string>[], overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        getSpaceEntitlementModuleAddresses(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string[]] & {
            entitlementModuleAddresses: string[];
        }>;
        getSpaceIdFromNetworkSpaceId(networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[BigNumber]>;
        getSpaceNames(overrides?: CallOverrides): Promise<[
            ZionSpaceManager.SpaceNameIDStructOutput[]
        ] & {
            spaceNames: ZionSpaceManager.SpaceNameIDStructOutput[];
        }>;
        getSpaceOwner(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[string] & {
            ownerAddress: string;
        }>;
        getSpaceValues(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            string,
            string,
            string
        ] & {
            spaceId: BigNumber;
            createdAt: BigNumber;
            name: string;
            creatorAddress: string;
            ownerAddress: string;
        }>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, entitlementType: PromiseOrValue<BigNumberish>, userAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;
        networkSpaceIdToSpaceId(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[BigNumber]>;
        registeredSpaceNames(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<[boolean]>;
        setNetworkSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<ContractTransaction>;
        spaces(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            BigNumber,
            string,
            string,
            string
        ] & {
            spaceId: BigNumber;
            createdAt: BigNumber;
            networkSpaceId: BigNumber;
            name: string;
            creatorAddress: string;
            ownerAddress: string;
        }>;
    };
    addEntitlementModuleAddress(spaceId: PromiseOrValue<BigNumberish>, _entitlementModuleAddress: PromiseOrValue<string>, tag: PromiseOrValue<string>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    createSpace(spaceName: PromiseOrValue<string>, entitlementModuleAddresses: PromiseOrValue<string>[], overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    getSpaceEntitlementModuleAddresses(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
    getSpaceIdFromNetworkSpaceId(networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
    getSpaceNames(overrides?: CallOverrides): Promise<ZionSpaceManager.SpaceNameIDStructOutput[]>;
    getSpaceOwner(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
    getSpaceValues(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
        BigNumber,
        BigNumber,
        string,
        string,
        string
    ] & {
        spaceId: BigNumber;
        createdAt: BigNumber;
        name: string;
        creatorAddress: string;
        ownerAddress: string;
    }>;
    isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, entitlementType: PromiseOrValue<BigNumberish>, userAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
    networkSpaceIdToSpaceId(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
    registeredSpaceNames(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
    setNetworkSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
        from?: PromiseOrValue<string>;
    }): Promise<ContractTransaction>;
    spaces(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
        BigNumber,
        BigNumber,
        BigNumber,
        string,
        string,
        string
    ] & {
        spaceId: BigNumber;
        createdAt: BigNumber;
        networkSpaceId: BigNumber;
        name: string;
        creatorAddress: string;
        ownerAddress: string;
    }>;
    callStatic: {
        addEntitlementModuleAddress(spaceId: PromiseOrValue<BigNumberish>, _entitlementModuleAddress: PromiseOrValue<string>, tag: PromiseOrValue<string>, overrides?: CallOverrides): Promise<void>;
        createSpace(spaceName: PromiseOrValue<string>, entitlementModuleAddresses: PromiseOrValue<string>[], overrides?: CallOverrides): Promise<void>;
        getSpaceEntitlementModuleAddresses(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string[]>;
        getSpaceIdFromNetworkSpaceId(networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceNames(overrides?: CallOverrides): Promise<ZionSpaceManager.SpaceNameIDStructOutput[]>;
        getSpaceOwner(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<string>;
        getSpaceValues(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            string,
            string,
            string
        ] & {
            spaceId: BigNumber;
            createdAt: BigNumber;
            name: string;
            creatorAddress: string;
            ownerAddress: string;
        }>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, entitlementType: PromiseOrValue<BigNumberish>, userAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
        networkSpaceIdToSpaceId(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        registeredSpaceNames(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<boolean>;
        setNetworkSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<void>;
        spaces(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            BigNumber,
            string,
            string,
            string
        ] & {
            spaceId: BigNumber;
            createdAt: BigNumber;
            networkSpaceId: BigNumber;
            name: string;
            creatorAddress: string;
            ownerAddress: string;
        }>;
    };
    filters: {
        "CreateSpace(address,string)"(owner?: PromiseOrValue<string> | null, spaceName?: PromiseOrValue<string> | null): CreateSpaceEventFilter;
        CreateSpace(owner?: PromiseOrValue<string> | null, spaceName?: PromiseOrValue<string> | null): CreateSpaceEventFilter;
    };
    estimateGas: {
        addEntitlementModuleAddress(spaceId: PromiseOrValue<BigNumberish>, _entitlementModuleAddress: PromiseOrValue<string>, tag: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        createSpace(spaceName: PromiseOrValue<string>, entitlementModuleAddresses: PromiseOrValue<string>[], overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        getSpaceEntitlementModuleAddresses(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceIdFromNetworkSpaceId(networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceNames(overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceOwner(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        getSpaceValues(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, entitlementType: PromiseOrValue<BigNumberish>, userAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        networkSpaceIdToSpaceId(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
        registeredSpaceNames(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
        setNetworkSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<BigNumber>;
        spaces(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        addEntitlementModuleAddress(spaceId: PromiseOrValue<BigNumberish>, _entitlementModuleAddress: PromiseOrValue<string>, tag: PromiseOrValue<string>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        createSpace(spaceName: PromiseOrValue<string>, entitlementModuleAddresses: PromiseOrValue<string>[], overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        getSpaceEntitlementModuleAddresses(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceIdFromNetworkSpaceId(networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceNames(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceOwner(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getSpaceValues(_spaceId: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        isEntitled(spaceId: PromiseOrValue<BigNumberish>, roomId: PromiseOrValue<BigNumberish>, entitlementType: PromiseOrValue<BigNumberish>, userAddress: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        networkSpaceIdToSpaceId(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        registeredSpaceNames(arg0: PromiseOrValue<string>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        setNetworkSpaceId(spaceId: PromiseOrValue<BigNumberish>, networkSpaceId: PromiseOrValue<BigNumberish>, overrides?: Overrides & {
            from?: PromiseOrValue<string>;
        }): Promise<PopulatedTransaction>;
        spaces(arg0: PromiseOrValue<BigNumberish>, overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
//# sourceMappingURL=ZionSpaceManager.d.ts.map