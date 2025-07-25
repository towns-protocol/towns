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

export declare namespace DropGroup {
  export type ClaimConditionStruct = {
    currency: PromiseOrValue<string>;
    startTimestamp: PromiseOrValue<BigNumberish>;
    endTimestamp: PromiseOrValue<BigNumberish>;
    penaltyBps: PromiseOrValue<BigNumberish>;
    maxClaimableSupply: PromiseOrValue<BigNumberish>;
    supplyClaimed: PromiseOrValue<BigNumberish>;
    merkleRoot: PromiseOrValue<BytesLike>;
  };

  export type ClaimConditionStructOutput = [
    string,
    number,
    number,
    number,
    BigNumber,
    BigNumber,
    string
  ] & {
    currency: string;
    startTimestamp: number;
    endTimestamp: number;
    penaltyBps: number;
    maxClaimableSupply: BigNumber;
    supplyClaimed: BigNumber;
    merkleRoot: string;
  };
}

export declare namespace DropClaim {
  export type ClaimStruct = {
    conditionId: PromiseOrValue<BigNumberish>;
    account: PromiseOrValue<string>;
    recipient: PromiseOrValue<string>;
    quantity: PromiseOrValue<BigNumberish>;
    points: PromiseOrValue<BigNumberish>;
    proof: PromiseOrValue<BytesLike>[];
  };

  export type ClaimStructOutput = [
    BigNumber,
    string,
    string,
    BigNumber,
    BigNumber,
    string[]
  ] & {
    conditionId: BigNumber;
    account: string;
    recipient: string;
    quantity: BigNumber;
    points: BigNumber;
    proof: string[];
  };
}

export interface IDropFacetInterface extends utils.Interface {
  functions: {
    "addClaimCondition((address,uint40,uint40,uint16,uint256,uint256,bytes32))": FunctionFragment;
    "claimAndStake((uint256,address,address,uint256,uint256,bytes32[]),address,uint256,bytes)": FunctionFragment;
    "claimWithPenalty((uint256,address,address,uint256,uint256,bytes32[]),uint16)": FunctionFragment;
    "getActiveClaimConditionId()": FunctionFragment;
    "getClaimConditionById(uint256)": FunctionFragment;
    "getClaimConditions()": FunctionFragment;
    "getDepositIdByWallet(address,uint256)": FunctionFragment;
    "getSupplyClaimedByWallet(address,uint256)": FunctionFragment;
    "setClaimConditions((address,uint40,uint40,uint16,uint256,uint256,bytes32)[])": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "addClaimCondition"
      | "claimAndStake"
      | "claimWithPenalty"
      | "getActiveClaimConditionId"
      | "getClaimConditionById"
      | "getClaimConditions"
      | "getDepositIdByWallet"
      | "getSupplyClaimedByWallet"
      | "setClaimConditions"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addClaimCondition",
    values: [DropGroup.ClaimConditionStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "claimAndStake",
    values: [
      DropClaim.ClaimStruct,
      PromiseOrValue<string>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BytesLike>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "claimWithPenalty",
    values: [DropClaim.ClaimStruct, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "getActiveClaimConditionId",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getClaimConditionById",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "getClaimConditions",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getDepositIdByWallet",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "getSupplyClaimedByWallet",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "setClaimConditions",
    values: [DropGroup.ClaimConditionStruct[]]
  ): string;

  decodeFunctionResult(
    functionFragment: "addClaimCondition",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "claimAndStake",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "claimWithPenalty",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getActiveClaimConditionId",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getClaimConditionById",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getClaimConditions",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDepositIdByWallet",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getSupplyClaimedByWallet",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setClaimConditions",
    data: BytesLike
  ): Result;

  events: {
    "DropFacet_ClaimConditionAdded(uint256,tuple)": EventFragment;
    "DropFacet_ClaimConditionsUpdated(uint256,tuple[])": EventFragment;
    "DropFacet_Claimed_And_Staked(uint256,address,address,uint256)": EventFragment;
    "DropFacet_Claimed_WithPenalty(uint256,address,address,uint256)": EventFragment;
  };

  getEvent(
    nameOrSignatureOrTopic: "DropFacet_ClaimConditionAdded"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "DropFacet_ClaimConditionsUpdated"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "DropFacet_Claimed_And_Staked"
  ): EventFragment;
  getEvent(
    nameOrSignatureOrTopic: "DropFacet_Claimed_WithPenalty"
  ): EventFragment;
}

export interface DropFacet_ClaimConditionAddedEventObject {
  conditionId: BigNumber;
  condition: DropGroup.ClaimConditionStructOutput;
}
export type DropFacet_ClaimConditionAddedEvent = TypedEvent<
  [BigNumber, DropGroup.ClaimConditionStructOutput],
  DropFacet_ClaimConditionAddedEventObject
>;

export type DropFacet_ClaimConditionAddedEventFilter =
  TypedEventFilter<DropFacet_ClaimConditionAddedEvent>;

export interface DropFacet_ClaimConditionsUpdatedEventObject {
  conditionId: BigNumber;
  conditions: DropGroup.ClaimConditionStructOutput[];
}
export type DropFacet_ClaimConditionsUpdatedEvent = TypedEvent<
  [BigNumber, DropGroup.ClaimConditionStructOutput[]],
  DropFacet_ClaimConditionsUpdatedEventObject
>;

export type DropFacet_ClaimConditionsUpdatedEventFilter =
  TypedEventFilter<DropFacet_ClaimConditionsUpdatedEvent>;

export interface DropFacet_Claimed_And_StakedEventObject {
  conditionId: BigNumber;
  claimer: string;
  account: string;
  amount: BigNumber;
}
export type DropFacet_Claimed_And_StakedEvent = TypedEvent<
  [BigNumber, string, string, BigNumber],
  DropFacet_Claimed_And_StakedEventObject
>;

export type DropFacet_Claimed_And_StakedEventFilter =
  TypedEventFilter<DropFacet_Claimed_And_StakedEvent>;

export interface DropFacet_Claimed_WithPenaltyEventObject {
  conditionId: BigNumber;
  claimer: string;
  account: string;
  amount: BigNumber;
}
export type DropFacet_Claimed_WithPenaltyEvent = TypedEvent<
  [BigNumber, string, string, BigNumber],
  DropFacet_Claimed_WithPenaltyEventObject
>;

export type DropFacet_Claimed_WithPenaltyEventFilter =
  TypedEventFilter<DropFacet_Claimed_WithPenaltyEvent>;

export interface IDropFacet extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IDropFacetInterface;

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
    addClaimCondition(
      condition: DropGroup.ClaimConditionStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    claimAndStake(
      req: DropClaim.ClaimStruct,
      delegatee: PromiseOrValue<string>,
      deadline: PromiseOrValue<BigNumberish>,
      signature: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    claimWithPenalty(
      req: DropClaim.ClaimStruct,
      expectedPenaltyBps: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    getActiveClaimConditionId(overrides?: CallOverrides): Promise<[BigNumber]>;

    getClaimConditionById(
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[DropGroup.ClaimConditionStructOutput]>;

    getClaimConditions(
      overrides?: CallOverrides
    ): Promise<[DropGroup.ClaimConditionStructOutput[]]>;

    getDepositIdByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    getSupplyClaimedByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    setClaimConditions(
      conditions: DropGroup.ClaimConditionStruct[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  addClaimCondition(
    condition: DropGroup.ClaimConditionStruct,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  claimAndStake(
    req: DropClaim.ClaimStruct,
    delegatee: PromiseOrValue<string>,
    deadline: PromiseOrValue<BigNumberish>,
    signature: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  claimWithPenalty(
    req: DropClaim.ClaimStruct,
    expectedPenaltyBps: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  getActiveClaimConditionId(overrides?: CallOverrides): Promise<BigNumber>;

  getClaimConditionById(
    conditionId: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<DropGroup.ClaimConditionStructOutput>;

  getClaimConditions(
    overrides?: CallOverrides
  ): Promise<DropGroup.ClaimConditionStructOutput[]>;

  getDepositIdByWallet(
    account: PromiseOrValue<string>,
    conditionId: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  getSupplyClaimedByWallet(
    account: PromiseOrValue<string>,
    conditionId: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  setClaimConditions(
    conditions: DropGroup.ClaimConditionStruct[],
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    addClaimCondition(
      condition: DropGroup.ClaimConditionStruct,
      overrides?: CallOverrides
    ): Promise<void>;

    claimAndStake(
      req: DropClaim.ClaimStruct,
      delegatee: PromiseOrValue<string>,
      deadline: PromiseOrValue<BigNumberish>,
      signature: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    claimWithPenalty(
      req: DropClaim.ClaimStruct,
      expectedPenaltyBps: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getActiveClaimConditionId(overrides?: CallOverrides): Promise<BigNumber>;

    getClaimConditionById(
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<DropGroup.ClaimConditionStructOutput>;

    getClaimConditions(
      overrides?: CallOverrides
    ): Promise<DropGroup.ClaimConditionStructOutput[]>;

    getDepositIdByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getSupplyClaimedByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setClaimConditions(
      conditions: DropGroup.ClaimConditionStruct[],
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "DropFacet_ClaimConditionAdded(uint256,tuple)"(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      condition?: null
    ): DropFacet_ClaimConditionAddedEventFilter;
    DropFacet_ClaimConditionAdded(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      condition?: null
    ): DropFacet_ClaimConditionAddedEventFilter;

    "DropFacet_ClaimConditionsUpdated(uint256,tuple[])"(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      conditions?: null
    ): DropFacet_ClaimConditionsUpdatedEventFilter;
    DropFacet_ClaimConditionsUpdated(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      conditions?: null
    ): DropFacet_ClaimConditionsUpdatedEventFilter;

    "DropFacet_Claimed_And_Staked(uint256,address,address,uint256)"(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      claimer?: PromiseOrValue<string> | null,
      account?: PromiseOrValue<string> | null,
      amount?: null
    ): DropFacet_Claimed_And_StakedEventFilter;
    DropFacet_Claimed_And_Staked(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      claimer?: PromiseOrValue<string> | null,
      account?: PromiseOrValue<string> | null,
      amount?: null
    ): DropFacet_Claimed_And_StakedEventFilter;

    "DropFacet_Claimed_WithPenalty(uint256,address,address,uint256)"(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      claimer?: PromiseOrValue<string> | null,
      account?: PromiseOrValue<string> | null,
      amount?: null
    ): DropFacet_Claimed_WithPenaltyEventFilter;
    DropFacet_Claimed_WithPenalty(
      conditionId?: PromiseOrValue<BigNumberish> | null,
      claimer?: PromiseOrValue<string> | null,
      account?: PromiseOrValue<string> | null,
      amount?: null
    ): DropFacet_Claimed_WithPenaltyEventFilter;
  };

  estimateGas: {
    addClaimCondition(
      condition: DropGroup.ClaimConditionStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    claimAndStake(
      req: DropClaim.ClaimStruct,
      delegatee: PromiseOrValue<string>,
      deadline: PromiseOrValue<BigNumberish>,
      signature: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    claimWithPenalty(
      req: DropClaim.ClaimStruct,
      expectedPenaltyBps: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    getActiveClaimConditionId(overrides?: CallOverrides): Promise<BigNumber>;

    getClaimConditionById(
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getClaimConditions(overrides?: CallOverrides): Promise<BigNumber>;

    getDepositIdByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getSupplyClaimedByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    setClaimConditions(
      conditions: DropGroup.ClaimConditionStruct[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addClaimCondition(
      condition: DropGroup.ClaimConditionStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    claimAndStake(
      req: DropClaim.ClaimStruct,
      delegatee: PromiseOrValue<string>,
      deadline: PromiseOrValue<BigNumberish>,
      signature: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    claimWithPenalty(
      req: DropClaim.ClaimStruct,
      expectedPenaltyBps: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    getActiveClaimConditionId(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getClaimConditionById(
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getClaimConditions(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getDepositIdByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getSupplyClaimedByWallet(
      account: PromiseOrValue<string>,
      conditionId: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    setClaimConditions(
      conditions: DropGroup.ClaimConditionStruct[],
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
