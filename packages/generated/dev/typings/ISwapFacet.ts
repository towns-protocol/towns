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
  PayableOverrides,
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

export declare namespace ISwapRouterBase {
  export type ExactInputParamsStruct = {
    tokenIn: PromiseOrValue<string>;
    tokenOut: PromiseOrValue<string>;
    amountIn: PromiseOrValue<BigNumberish>;
    minAmountOut: PromiseOrValue<BigNumberish>;
    recipient: PromiseOrValue<string>;
  };

  export type ExactInputParamsStructOutput = [
    string,
    string,
    BigNumber,
    BigNumber,
    string
  ] & {
    tokenIn: string;
    tokenOut: string;
    amountIn: BigNumber;
    minAmountOut: BigNumber;
    recipient: string;
  };

  export type RouterParamsStruct = {
    router: PromiseOrValue<string>;
    approveTarget: PromiseOrValue<string>;
    swapData: PromiseOrValue<BytesLike>;
  };

  export type RouterParamsStructOutput = [string, string, string] & {
    router: string;
    approveTarget: string;
    swapData: string;
  };

  export type FeeConfigStruct = {
    recipient: PromiseOrValue<string>;
    feeBps: PromiseOrValue<BigNumberish>;
  };

  export type FeeConfigStructOutput = [string, number] & {
    recipient: string;
    feeBps: number;
  };

  export type Permit2ParamsStruct = {
    owner: PromiseOrValue<string>;
    nonce: PromiseOrValue<BigNumberish>;
    deadline: PromiseOrValue<BigNumberish>;
    signature: PromiseOrValue<BytesLike>;
  };

  export type Permit2ParamsStructOutput = [
    string,
    BigNumber,
    BigNumber,
    string
  ] & {
    owner: string;
    nonce: BigNumber;
    deadline: BigNumber;
    signature: string;
  };
}

export interface ISwapFacetInterface extends utils.Interface {
  functions: {
    "executeSwap((address,address,uint256,uint256,address),(address,address,bytes),address)": FunctionFragment;
    "executeSwapWithPermit((address,address,uint256,uint256,address),(address,address,bytes),(address,uint16),(address,uint256,uint256,bytes))": FunctionFragment;
    "getSwapFees()": FunctionFragment;
    "getSwapRouter()": FunctionFragment;
    "setSwapFeeConfig(uint16,bool)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "executeSwap"
      | "executeSwapWithPermit"
      | "getSwapFees"
      | "getSwapRouter"
      | "setSwapFeeConfig"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "executeSwap",
    values: [
      ISwapRouterBase.ExactInputParamsStruct,
      ISwapRouterBase.RouterParamsStruct,
      PromiseOrValue<string>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "executeSwapWithPermit",
    values: [
      ISwapRouterBase.ExactInputParamsStruct,
      ISwapRouterBase.RouterParamsStruct,
      ISwapRouterBase.FeeConfigStruct,
      ISwapRouterBase.Permit2ParamsStruct
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "getSwapFees",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getSwapRouter",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setSwapFeeConfig",
    values: [PromiseOrValue<BigNumberish>, PromiseOrValue<boolean>]
  ): string;

  decodeFunctionResult(
    functionFragment: "executeSwap",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "executeSwapWithPermit",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getSwapFees",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getSwapRouter",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setSwapFeeConfig",
    data: BytesLike
  ): Result;

  events: {
    "FeeDistribution(address,address,address,uint256,uint256)": EventFragment;
    "Swap(address,address,address,address,uint256,uint256,address)": EventFragment;
    "SwapExecuted(address,address,address,uint256,uint256,address)": EventFragment;
    "SwapFeeConfigUpdated(uint16,bool)": EventFragment;
    "SwapRouterInitialized(address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "FeeDistribution"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Swap"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SwapExecuted"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SwapFeeConfigUpdated"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SwapRouterInitialized"): EventFragment;
}

export interface FeeDistributionEventObject {
  token: string;
  protocol: string;
  poster: string;
  protocolAmount: BigNumber;
  posterAmount: BigNumber;
}
export type FeeDistributionEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber],
  FeeDistributionEventObject
>;

export type FeeDistributionEventFilter = TypedEventFilter<FeeDistributionEvent>;

export interface SwapEventObject {
  router: string;
  caller: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: BigNumber;
  amountOut: BigNumber;
  recipient: string;
}
export type SwapEvent = TypedEvent<
  [string, string, string, string, BigNumber, BigNumber, string],
  SwapEventObject
>;

export type SwapEventFilter = TypedEventFilter<SwapEvent>;

export interface SwapExecutedEventObject {
  recipient: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: BigNumber;
  amountOut: BigNumber;
  poster: string;
}
export type SwapExecutedEvent = TypedEvent<
  [string, string, string, BigNumber, BigNumber, string],
  SwapExecutedEventObject
>;

export type SwapExecutedEventFilter = TypedEventFilter<SwapExecutedEvent>;

export interface SwapFeeConfigUpdatedEventObject {
  posterFeeBps: number;
  forwardPosterFee: boolean;
}
export type SwapFeeConfigUpdatedEvent = TypedEvent<
  [number, boolean],
  SwapFeeConfigUpdatedEventObject
>;

export type SwapFeeConfigUpdatedEventFilter =
  TypedEventFilter<SwapFeeConfigUpdatedEvent>;

export interface SwapRouterInitializedEventObject {
  spaceFactory: string;
}
export type SwapRouterInitializedEvent = TypedEvent<
  [string],
  SwapRouterInitializedEventObject
>;

export type SwapRouterInitializedEventFilter =
  TypedEventFilter<SwapRouterInitializedEvent>;

export interface ISwapFacet extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: ISwapFacetInterface;

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
    executeSwap(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      poster: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    executeSwapWithPermit(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      posterFee: ISwapRouterBase.FeeConfigStruct,
      permit: ISwapRouterBase.Permit2ParamsStruct,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    getSwapFees(
      overrides?: CallOverrides
    ): Promise<
      [number, number, boolean] & {
        protocolBps: number;
        posterBps: number;
        forwardPosterFee: boolean;
      }
    >;

    getSwapRouter(overrides?: CallOverrides): Promise<[string]>;

    setSwapFeeConfig(
      posterFeeBps: PromiseOrValue<BigNumberish>,
      forwardPosterFee: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  executeSwap(
    params: ISwapRouterBase.ExactInputParamsStruct,
    routerParams: ISwapRouterBase.RouterParamsStruct,
    poster: PromiseOrValue<string>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  executeSwapWithPermit(
    params: ISwapRouterBase.ExactInputParamsStruct,
    routerParams: ISwapRouterBase.RouterParamsStruct,
    posterFee: ISwapRouterBase.FeeConfigStruct,
    permit: ISwapRouterBase.Permit2ParamsStruct,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  getSwapFees(
    overrides?: CallOverrides
  ): Promise<
    [number, number, boolean] & {
      protocolBps: number;
      posterBps: number;
      forwardPosterFee: boolean;
    }
  >;

  getSwapRouter(overrides?: CallOverrides): Promise<string>;

  setSwapFeeConfig(
    posterFeeBps: PromiseOrValue<BigNumberish>,
    forwardPosterFee: PromiseOrValue<boolean>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    executeSwap(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      poster: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    executeSwapWithPermit(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      posterFee: ISwapRouterBase.FeeConfigStruct,
      permit: ISwapRouterBase.Permit2ParamsStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getSwapFees(
      overrides?: CallOverrides
    ): Promise<
      [number, number, boolean] & {
        protocolBps: number;
        posterBps: number;
        forwardPosterFee: boolean;
      }
    >;

    getSwapRouter(overrides?: CallOverrides): Promise<string>;

    setSwapFeeConfig(
      posterFeeBps: PromiseOrValue<BigNumberish>,
      forwardPosterFee: PromiseOrValue<boolean>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "FeeDistribution(address,address,address,uint256,uint256)"(
      token?: PromiseOrValue<string> | null,
      protocol?: PromiseOrValue<string> | null,
      poster?: PromiseOrValue<string> | null,
      protocolAmount?: null,
      posterAmount?: null
    ): FeeDistributionEventFilter;
    FeeDistribution(
      token?: PromiseOrValue<string> | null,
      protocol?: PromiseOrValue<string> | null,
      poster?: PromiseOrValue<string> | null,
      protocolAmount?: null,
      posterAmount?: null
    ): FeeDistributionEventFilter;

    "Swap(address,address,address,address,uint256,uint256,address)"(
      router?: PromiseOrValue<string> | null,
      caller?: PromiseOrValue<string> | null,
      tokenIn?: null,
      tokenOut?: null,
      amountIn?: null,
      amountOut?: null,
      recipient?: null
    ): SwapEventFilter;
    Swap(
      router?: PromiseOrValue<string> | null,
      caller?: PromiseOrValue<string> | null,
      tokenIn?: null,
      tokenOut?: null,
      amountIn?: null,
      amountOut?: null,
      recipient?: null
    ): SwapEventFilter;

    "SwapExecuted(address,address,address,uint256,uint256,address)"(
      recipient?: PromiseOrValue<string> | null,
      tokenIn?: PromiseOrValue<string> | null,
      tokenOut?: PromiseOrValue<string> | null,
      amountIn?: null,
      amountOut?: null,
      poster?: null
    ): SwapExecutedEventFilter;
    SwapExecuted(
      recipient?: PromiseOrValue<string> | null,
      tokenIn?: PromiseOrValue<string> | null,
      tokenOut?: PromiseOrValue<string> | null,
      amountIn?: null,
      amountOut?: null,
      poster?: null
    ): SwapExecutedEventFilter;

    "SwapFeeConfigUpdated(uint16,bool)"(
      posterFeeBps?: null,
      forwardPosterFee?: null
    ): SwapFeeConfigUpdatedEventFilter;
    SwapFeeConfigUpdated(
      posterFeeBps?: null,
      forwardPosterFee?: null
    ): SwapFeeConfigUpdatedEventFilter;

    "SwapRouterInitialized(address)"(
      spaceFactory?: null
    ): SwapRouterInitializedEventFilter;
    SwapRouterInitialized(
      spaceFactory?: null
    ): SwapRouterInitializedEventFilter;
  };

  estimateGas: {
    executeSwap(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      poster: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    executeSwapWithPermit(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      posterFee: ISwapRouterBase.FeeConfigStruct,
      permit: ISwapRouterBase.Permit2ParamsStruct,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    getSwapFees(overrides?: CallOverrides): Promise<BigNumber>;

    getSwapRouter(overrides?: CallOverrides): Promise<BigNumber>;

    setSwapFeeConfig(
      posterFeeBps: PromiseOrValue<BigNumberish>,
      forwardPosterFee: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    executeSwap(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      poster: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    executeSwapWithPermit(
      params: ISwapRouterBase.ExactInputParamsStruct,
      routerParams: ISwapRouterBase.RouterParamsStruct,
      posterFee: ISwapRouterBase.FeeConfigStruct,
      permit: ISwapRouterBase.Permit2ParamsStruct,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    getSwapFees(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getSwapRouter(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    setSwapFeeConfig(
      posterFeeBps: PromiseOrValue<BigNumberish>,
      forwardPosterFee: PromiseOrValue<boolean>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
