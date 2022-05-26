import {
  AppService,
  AppServiceRegistration,
  Bridge,
  BridgeOpts,
  Logging,
} from "matrix-appservice-bridge";

import { IConfig } from "./IConfig";
import { LOGGER_NAME } from "./global-const";
import { ZionBridgeController } from "./ZionBridgeController";

const PrintTag = "[Main]";
const log = Logging.get(LOGGER_NAME);

export class Main {
  private bridge: Bridge;
  private config: IConfig;
  private appService: AppService;

  constructor(config: IConfig, registration: AppServiceRegistration) {
    this.config = config;
    const opts = getBridgeOptions(config, registration);
    this.bridge = new Bridge(opts);

    const homeserverToken = registration.getHomeserverToken();
    if (homeserverToken === null) {
      throw Error("Homeserver token is null");
    }

    this.appService = new AppService({
      homeserverToken,
      httpMaxSizeBytes: 0,
    });
  }

  public async killBridge(): Promise<void> {
    log.info(`${PrintTag} killBridge`);
  }

  public async run(port: number): Promise<boolean> {
    log.info(`${PrintTag} run`, { port });
    await this.bridge.initalise();

    await this.bridge.listen(
      port,
      this.config.homeserver.appservice_host,
      undefined,
      this.appService,
    );

    // Success
    return true;
  }
}

function getBridgeOptions(
  config: IConfig,
  registration: string | AppServiceRegistration,
): BridgeOpts {
  return {
    controller: new ZionBridgeController(),
    domain: config.homeserver.server_name,
    homeserverUrl: config.homeserver.url,
    registration,
    suppressEcho: false,
  };
}
