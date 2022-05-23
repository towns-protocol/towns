import {
  AppServiceRegistration,
  BridgeController,
  BridgeOpts,
} from "matrix-appservice-bridge";

import { IConfig } from "./IConfig";
import { ZionBridgeController } from "./ZionBridgeController";

export class ZionBridgeOpts implements BridgeOpts {
  private config: IConfig;
  private appService: string | AppServiceRegistration;
  private bridgeController: ZionBridgeController;

  constructor(config: IConfig, registration: string | AppServiceRegistration) {
    this.config = config;
    this.appService = registration;
    this.bridgeController = new ZionBridgeController();
  }

  public get homeserverUrl(): string {
    return this.config.homeserverUrl;
  }

  public get domain(): string {
    return this.config.domain;
  }

  public get registration(): string | AppServiceRegistration {
    return this.appService;
  }

  public get controller(): BridgeController {
    return this.bridgeController;
  }

  public async startAndListen(port: number): Promise<void> {}
}
