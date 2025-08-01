/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "./common";

export declare namespace IChannelBase {
  export type RolePermissionsStruct = {
    roleId: PromiseOrValue<BigNumberish>;
    permissions: PromiseOrValue<string>[];
  };

  export type RolePermissionsStructOutput = [BigNumber, string[]] & {
    roleId: BigNumber;
    permissions: string[];
  };

  export type ChannelStruct = {
    id: PromiseOrValue<BytesLike>;
    disabled: PromiseOrValue<boolean>;
    metadata: PromiseOrValue<string>;
    roleIds: PromiseOrValue<BigNumberish>[];
  };

  export type ChannelStructOutput = [string, boolean, string, BigNumber[]] & {
    id: string;
    disabled: boolean;
    metadata: string;
    roleIds: BigNumber[];
  };
}

export interface ChannelsInterface extends utils.Interface {
  functions: {
    "addRoleToChannel(bytes32,uint256)": FunctionFragment;
    "createChannel(bytes32,string,uint256[])": FunctionFragment;
    "createChannelWithOverridePermissions(bytes32,string,(uint256,string[])[])": FunctionFragment;
    "getChannel(bytes32)": FunctionFragment;
    "getChannels()": FunctionFragment;
    "getRolesByChannel(bytes32)": FunctionFragment;
    "removeChannel(bytes32)": FunctionFragment;
    "removeRoleFromChannel(bytes32,uint256)": FunctionFragment;
    "updateChannel(bytes32,string,bool)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "addRoleToChannel"
      | "createChannel"
      | "createChannelWithOverridePermissions"
      | "getChannel"
      | "getChannels"
      | "getRolesByChannel"
      | "removeChannel"
      | "removeRoleFromChannel"
      | "updateChannel"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addRoleToChannel",
    values: [PromiseOrValue<BytesLike>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "createChannel",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>[]
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "createChannelWithOverridePermissions",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<string>,
      IChannelBase.RolePermissionsStruct[]
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "getChannel",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "getChannels",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getRolesByChannel",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "removeChannel",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "removeRoleFromChannel",
    values: [PromiseOrValue<BytesLike>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "updateChannel",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<string>,
      PromiseOrValue<boolean>
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "addRoleToChannel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "createChannel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "createChannelWithOverridePermissions",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getChannel", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getChannels",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getRolesByChannel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "removeChannel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "removeRoleFromChannel",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "updateChannel",
    data: BytesLike
  ): Result;

  events: {
    "ChannelCreated(address,bytes32)": EventFragment;
    "ChannelRemoved(address,bytes32)": EventFragment;
    "ChannelRoleAdded(address,bytes32,uint256)": EventFragment;
    "ChannelRoleRemoved(address,bytes32,uint256)": EventFragment;
    "ChannelUpdated(address,bytes32)": EventFragment;
    "Initialized(uint32)": EventFragment;
    "InterfaceAdded(bytes4)": EventFragment;
    "InterfaceRemoved(bytes4)": EventFragment;
    "OwnershipTransferred(address,address)": EventFragment;
    "PermissionsAddedToChannelRole(address,uint256,bytes32)": EventFragment;
    "PermissionsRemovedFromChannelRole(address,uint256,bytes32)": EventFragment;
    "PermissionsUpdatedForChannelRole(address,uint256,bytes32)": EventFragment;
    "RoleCreated(address,uint256)": EventFragment;
    "RoleRemoved(address,uint256)": EventFragment;
    "RoleUpdated(address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "ChannelCreated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ChannelRemoved"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ChannelRoleAdded"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ChannelRoleRemoved"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "ChannelUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Initialized"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "InterfaceAdded"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "InterfaceRemoved"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "PermissionsAddedToChannelRole"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "PermissionsRemovedFromChannelRole"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "PermissionsUpdatedForChannelRole"
  ): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RoleCreated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RoleRemoved"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "RoleUpdated"): EventFragment;
}

export interface ChannelCreatedEventObject {
  caller: string;
  channelId: string;
}
export type ChannelCreatedEvent = TypedEvent<
  [string, string],
  ChannelCreatedEventObject
>;

export type ChannelCreatedEventFilter = TypedEventFilter<ChannelCreatedEvent>;

export interface ChannelRemovedEventObject {
  caller: string;
  channelId: string;
}
export type ChannelRemovedEvent = TypedEvent<
  [string, string],
  ChannelRemovedEventObject
>;

export type ChannelRemovedEventFilter = TypedEventFilter<ChannelRemovedEvent>;

export interface ChannelRoleAddedEventObject {
  caller: string;
  channelId: string;
  roleId: BigNumber;
}
export type ChannelRoleAddedEvent = TypedEvent<
  [string, string, BigNumber],
  ChannelRoleAddedEventObject
>;

export type ChannelRoleAddedEventFilter =
  TypedEventFilter<ChannelRoleAddedEvent>;

export interface ChannelRoleRemovedEventObject {
  caller: string;
  channelId: string;
  roleId: BigNumber;
}
export type ChannelRoleRemovedEvent = TypedEvent<
  [string, string, BigNumber],
  ChannelRoleRemovedEventObject
>;

export type ChannelRoleRemovedEventFilter =
  TypedEventFilter<ChannelRoleRemovedEvent>;

export interface ChannelUpdatedEventObject {
  caller: string;
  channelId: string;
}
export type ChannelUpdatedEvent = TypedEvent<
  [string, string],
  ChannelUpdatedEventObject
>;

export type ChannelUpdatedEventFilter = TypedEventFilter<ChannelUpdatedEvent>;

export interface InitializedEventObject {
  version: number;
}
export type InitializedEvent = TypedEvent<[number], InitializedEventObject>;

export type InitializedEventFilter = TypedEventFilter<InitializedEvent>;

export interface InterfaceAddedEventObject {
  interfaceId: string;
}
export type InterfaceAddedEvent = TypedEvent<
  [string],
  InterfaceAddedEventObject
>;

export type InterfaceAddedEventFilter = TypedEventFilter<InterfaceAddedEvent>;

export interface InterfaceRemovedEventObject {
  interfaceId: string;
}
export type InterfaceRemovedEvent = TypedEvent<
  [string],
  InterfaceRemovedEventObject
>;

export type InterfaceRemovedEventFilter =
  TypedEventFilter<InterfaceRemovedEvent>;

export interface OwnershipTransferredEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferredEvent = TypedEvent<
  [string, string],
  OwnershipTransferredEventObject
>;

export type OwnershipTransferredEventFilter =
  TypedEventFilter<OwnershipTransferredEvent>;

export interface PermissionsAddedToChannelRoleEventObject {
  updater: string;
  roleId: BigNumber;
  channelId: string;
}
export type PermissionsAddedToChannelRoleEvent = TypedEvent<
  [string, BigNumber, string],
  PermissionsAddedToChannelRoleEventObject
>;

export type PermissionsAddedToChannelRoleEventFilter =
  TypedEventFilter<PermissionsAddedToChannelRoleEvent>;

export interface PermissionsRemovedFromChannelRoleEventObject {
  updater: string;
  roleId: BigNumber;
  channelId: string;
}
export type PermissionsRemovedFromChannelRoleEvent = TypedEvent<
  [string, BigNumber, string],
  PermissionsRemovedFromChannelRoleEventObject
>;

export type PermissionsRemovedFromChannelRoleEventFilter =
  TypedEventFilter<PermissionsRemovedFromChannelRoleEvent>;

export interface PermissionsUpdatedForChannelRoleEventObject {
  updater: string;
  roleId: BigNumber;
  channelId: string;
}
export type PermissionsUpdatedForChannelRoleEvent = TypedEvent<
  [string, BigNumber, string],
  PermissionsUpdatedForChannelRoleEventObject
>;

export type PermissionsUpdatedForChannelRoleEventFilter =
  TypedEventFilter<PermissionsUpdatedForChannelRoleEvent>;

export interface RoleCreatedEventObject {
  creator: string;
  roleId: BigNumber;
}
export type RoleCreatedEvent = TypedEvent<
  [string, BigNumber],
  RoleCreatedEventObject
>;

export type RoleCreatedEventFilter = TypedEventFilter<RoleCreatedEvent>;

export interface RoleRemovedEventObject {
  remover: string;
  roleId: BigNumber;
}
export type RoleRemovedEvent = TypedEvent<
  [string, BigNumber],
  RoleRemovedEventObject
>;

export type RoleRemovedEventFilter = TypedEventFilter<RoleRemovedEvent>;

export interface RoleUpdatedEventObject {
  updater: string;
  roleId: BigNumber;
}
export type RoleUpdatedEvent = TypedEvent<
  [string, BigNumber],
  RoleUpdatedEventObject
>;

export type RoleUpdatedEventFilter = TypedEventFilter<RoleUpdatedEvent>;

export interface Channels extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ChannelsInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    addRoleToChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    createChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      roleIds: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    createChannelWithOverridePermissions(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      rolePermissions: IChannelBase.RolePermissionsStruct[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    getChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<
      [IChannelBase.ChannelStructOutput] & {
        channel: IChannelBase.ChannelStructOutput;
      }
    >;

    getChannels(
      overrides?: CallOverrides
    ): Promise<
      [IChannelBase.ChannelStructOutput[]] & {
        channels: IChannelBase.ChannelStructOutput[];
      }
    >;

    getRolesByChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[BigNumber[]] & { roleIds: BigNumber[] }>;

    removeChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    removeRoleFromChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    updateChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      disabled: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  addRoleToChannel(
    channelId: PromiseOrValue<BytesLike>,
    roleId: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  createChannel(
    channelId: PromiseOrValue<BytesLike>,
    metadata: PromiseOrValue<string>,
    roleIds: PromiseOrValue<BigNumberish>[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  createChannelWithOverridePermissions(
    channelId: PromiseOrValue<BytesLike>,
    metadata: PromiseOrValue<string>,
    rolePermissions: IChannelBase.RolePermissionsStruct[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  getChannel(
    channelId: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<IChannelBase.ChannelStructOutput>;

  getChannels(
    overrides?: CallOverrides
  ): Promise<IChannelBase.ChannelStructOutput[]>;

  getRolesByChannel(
    channelId: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<BigNumber[]>;

  removeChannel(
    channelId: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  removeRoleFromChannel(
    channelId: PromiseOrValue<BytesLike>,
    roleId: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  updateChannel(
    channelId: PromiseOrValue<BytesLike>,
    metadata: PromiseOrValue<string>,
    disabled: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    addRoleToChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    createChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      roleIds: PromiseOrValue<BigNumberish>[],
      overrides?: CallOverrides
    ): Promise<void>;

    createChannelWithOverridePermissions(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      rolePermissions: IChannelBase.RolePermissionsStruct[],
      overrides?: CallOverrides
    ): Promise<void>;

    getChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<IChannelBase.ChannelStructOutput>;

    getChannels(
      overrides?: CallOverrides
    ): Promise<IChannelBase.ChannelStructOutput[]>;

    getRolesByChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber[]>;

    removeChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;

    removeRoleFromChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    updateChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      disabled: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "ChannelCreated(address,bytes32)"(
      caller?: PromiseOrValue<string> | null,
      channelId?: null
    ): ChannelCreatedEventFilter;
    ChannelCreated(
      caller?: PromiseOrValue<string> | null,
      channelId?: null
    ): ChannelCreatedEventFilter;

    "ChannelRemoved(address,bytes32)"(
      caller?: PromiseOrValue<string> | null,
      channelId?: null
    ): ChannelRemovedEventFilter;
    ChannelRemoved(
      caller?: PromiseOrValue<string> | null,
      channelId?: null
    ): ChannelRemovedEventFilter;

    "ChannelRoleAdded(address,bytes32,uint256)"(
      caller?: PromiseOrValue<string> | null,
      channelId?: null,
      roleId?: null
    ): ChannelRoleAddedEventFilter;
    ChannelRoleAdded(
      caller?: PromiseOrValue<string> | null,
      channelId?: null,
      roleId?: null
    ): ChannelRoleAddedEventFilter;

    "ChannelRoleRemoved(address,bytes32,uint256)"(
      caller?: PromiseOrValue<string> | null,
      channelId?: null,
      roleId?: null
    ): ChannelRoleRemovedEventFilter;
    ChannelRoleRemoved(
      caller?: PromiseOrValue<string> | null,
      channelId?: null,
      roleId?: null
    ): ChannelRoleRemovedEventFilter;

    "ChannelUpdated(address,bytes32)"(
      caller?: PromiseOrValue<string> | null,
      channelId?: null
    ): ChannelUpdatedEventFilter;
    ChannelUpdated(
      caller?: PromiseOrValue<string> | null,
      channelId?: null
    ): ChannelUpdatedEventFilter;

    "Initialized(uint32)"(version?: null): InitializedEventFilter;
    Initialized(version?: null): InitializedEventFilter;

    "InterfaceAdded(bytes4)"(
      interfaceId?: PromiseOrValue<BytesLike> | null
    ): InterfaceAddedEventFilter;
    InterfaceAdded(
      interfaceId?: PromiseOrValue<BytesLike> | null
    ): InterfaceAddedEventFilter;

    "InterfaceRemoved(bytes4)"(
      interfaceId?: PromiseOrValue<BytesLike> | null
    ): InterfaceRemovedEventFilter;
    InterfaceRemoved(
      interfaceId?: PromiseOrValue<BytesLike> | null
    ): InterfaceRemovedEventFilter;

    "OwnershipTransferred(address,address)"(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null
    ): OwnershipTransferredEventFilter;
    OwnershipTransferred(
      previousOwner?: PromiseOrValue<string> | null,
      newOwner?: PromiseOrValue<string> | null
    ): OwnershipTransferredEventFilter;

    "PermissionsAddedToChannelRole(address,uint256,bytes32)"(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null,
      channelId?: PromiseOrValue<BytesLike> | null
    ): PermissionsAddedToChannelRoleEventFilter;
    PermissionsAddedToChannelRole(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null,
      channelId?: PromiseOrValue<BytesLike> | null
    ): PermissionsAddedToChannelRoleEventFilter;

    "PermissionsRemovedFromChannelRole(address,uint256,bytes32)"(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null,
      channelId?: PromiseOrValue<BytesLike> | null
    ): PermissionsRemovedFromChannelRoleEventFilter;
    PermissionsRemovedFromChannelRole(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null,
      channelId?: PromiseOrValue<BytesLike> | null
    ): PermissionsRemovedFromChannelRoleEventFilter;

    "PermissionsUpdatedForChannelRole(address,uint256,bytes32)"(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null,
      channelId?: PromiseOrValue<BytesLike> | null
    ): PermissionsUpdatedForChannelRoleEventFilter;
    PermissionsUpdatedForChannelRole(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null,
      channelId?: PromiseOrValue<BytesLike> | null
    ): PermissionsUpdatedForChannelRoleEventFilter;

    "RoleCreated(address,uint256)"(
      creator?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null
    ): RoleCreatedEventFilter;
    RoleCreated(
      creator?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null
    ): RoleCreatedEventFilter;

    "RoleRemoved(address,uint256)"(
      remover?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null
    ): RoleRemovedEventFilter;
    RoleRemoved(
      remover?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null
    ): RoleRemovedEventFilter;

    "RoleUpdated(address,uint256)"(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null
    ): RoleUpdatedEventFilter;
    RoleUpdated(
      updater?: PromiseOrValue<string> | null,
      roleId?: PromiseOrValue<BigNumberish> | null
    ): RoleUpdatedEventFilter;
  };

  estimateGas: {
    addRoleToChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    createChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      roleIds: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    createChannelWithOverridePermissions(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      rolePermissions: IChannelBase.RolePermissionsStruct[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    getChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getChannels(overrides?: CallOverrides): Promise<BigNumber>;

    getRolesByChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    removeChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    removeRoleFromChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    updateChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      disabled: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addRoleToChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    createChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      roleIds: PromiseOrValue<BigNumberish>[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    createChannelWithOverridePermissions(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      rolePermissions: IChannelBase.RolePermissionsStruct[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    getChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getChannels(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getRolesByChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    removeChannel(
      channelId: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    removeRoleFromChannel(
      channelId: PromiseOrValue<BytesLike>,
      roleId: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    updateChannel(
      channelId: PromiseOrValue<BytesLike>,
      metadata: PromiseOrValue<string>,
      disabled: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
