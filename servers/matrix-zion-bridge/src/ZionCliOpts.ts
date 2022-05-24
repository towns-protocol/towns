import {
  AppServiceRegistration,
  CliOpts,
  Logging,
} from "matrix-appservice-bridge";

import { IConfig } from "./IConfig";
import { Main } from "./Main";

const PrintTag = "[ZionCliOpts]";

type ConfigType = Record<string, unknown>;

interface BridgeConfig {
  /**
   * If true, the config will be required when generating a registration file.
   */
  affectsRegistration?: boolean;
  /**
   * Path to a schema YAML file (string) or the parsed schema file (object).
   */
  schema: string | Record<string, unknown>;
  /**
   * The default options for the config file.
   */
  defaults: Record<string, unknown>;
}

interface CliConfig {
  defaultPort: number;
  schema: string;
  registrationFilename: string;
}

export class ZionCliOpts implements CliOpts<ConfigType> {
  private cliConfig: CliConfig;

  constructor(config: CliConfig) {
    this.cliConfig = config;
  }

  public onConfigChanged(config: ConfigType): void {
    console.log(`${PrintTag} onConfigChanged`, config);
  }

  public generateRegistration(
    reg: AppServiceRegistration,
    callback: (finalReg: AppServiceRegistration) => void
  ): void {
    console.log(`${PrintTag} generateRegistration`, reg);
    callback(reg);
  }

  public get bridgeConfig(): BridgeConfig | undefined {
    /*
    const config: BridgeConfig = {
      defaults: {},
      affectsRegistration: true,
      schema: this.cliConfig.schema,
    };
    */
    console.log(`${PrintTag} bridgeConfig`, /*config*/ undefined);
    return undefined;
  }

  public get registrationPath(): string | undefined {
    return undefined; // this.cliConfig.registrationFilename;
  }

  public get enableRegistration(): boolean | undefined {
    return undefined;
  }

  public get enableLocalpart(): boolean | undefined {
    return undefined;
  }

  public get noUrl(): boolean | undefined {
    return undefined;
  }

  public run(
    port: number | null,
    rawConfig: ConfigType | null,
    registration: AppServiceRegistration | null
  ): void {
    console.log(`${PrintTag} run`, port, rawConfig, registration);

    const config = rawConfig as IConfig | null;
    if (!config) {
      throw Error("Config not ready");
    }
    Logging.configure(config.logging || {});
    const log = Logging.get("app");
    // Format config
    if (!registration) {
      throw Error("registration must be defined");
    }

    const main = new Main(config, registration);
    main
      .run(
        port || config.homeserver.appservice_port || this.cliConfig.defaultPort
      )
      .then((port) => {
        log.info("Matrix-side listening on port", port);
      })
      .catch((ex) => {
        log.error("Failed to start:", ex);
        process.exit(1);
      });

    process.on("SIGTERM", () => {
      log.info("Got SIGTERM");
      main
        .killBridge()
        .then(() => {
          process.exit(0);
        })
        .catch((ex: any) => {
          log.warn("Failed to kill bridge, exiting anyway", ex);
          process.exit(2);
        });
    });
  }
}
