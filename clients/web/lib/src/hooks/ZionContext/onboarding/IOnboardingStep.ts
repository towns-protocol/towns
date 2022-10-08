import { ZionClient } from "client/ZionClient";
import { TypedEventEmitter } from "matrix-js-sdk/lib/models/typed-event-emitter";
import { IOnboardingState, ObState_Error } from "./IOnboardingState";
import { User as MatrixUser } from "matrix-js-sdk";
import { ZionOnboardingOpts } from "client/ZionClientTypes";

export enum OnboardingStepEvent {
  StateUpdate = "state-update",
  Error = "error",
}

export type OnboardingStepEventHandlerMap = {
  [OnboardingStepEvent.StateUpdate]: (
    newState: IOnboardingState,
    isComplete: boolean,
  ) => void;
  [OnboardingStepEvent.Error]: (error: ObState_Error) => void;
};

export abstract class IOnboardingStep<
  T = IOnboardingState,
> extends TypedEventEmitter<
  OnboardingStepEvent,
  OnboardingStepEventHandlerMap
> {
  client: ZionClient;
  userId: string;

  constructor(client: ZionClient, userId: string) {
    super();
    this.client = client;
    this.userId = userId;
  }
  get opts(): ZionOnboardingOpts | undefined {
    return this.client.opts.onboardingOpts;
  }
  get user(): MatrixUser {
    const user = this.client.getUser(this.userId);
    if (!user) {
      throw new Error("IOnboardingStep::UserId is undefined");
    }
    return user;
  }
  abstract get state(): T;
  abstract shouldExecute(): boolean;
  abstract start(): void;
  abstract stop(): void;
}
