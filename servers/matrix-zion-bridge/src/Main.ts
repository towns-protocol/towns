import { AppServiceRegistration, Bridge } from "matrix-appservice-bridge";

import { IConfig } from "./IConfig";
import { ZionBridgeOpts } from "./ZionBridgeOpts";

const PrintTag = "[Main]";

export class Main {
  private bridge: Bridge;

  constructor(config: IConfig, appService: AppServiceRegistration) {
    const opts = new ZionBridgeOpts(config, appService);
    this.bridge = new Bridge(opts);
  }

  public async killBridge(): Promise<void> {
    console.log(`${PrintTag} killBridge`);
  }

  public async run(port: number): Promise<boolean> {
    console.log(`${PrintTag} run`, { port });
    await this.bridge.initalise();
    // Success
    return true;
  }
}
