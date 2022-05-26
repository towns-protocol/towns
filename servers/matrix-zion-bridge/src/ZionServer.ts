import {
  AppServiceRegistration,
  Cli,
  CliOpts,
  Logging,
} from "matrix-appservice-bridge";

import { IConfig } from "./IConfig";
import { LOGGER_NAME } from "./global-const";
import { Main } from "./Main";

const PrintTag = "[ZionServer]";

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

interface CliOptions {
  defaultPort: number;
  schema: string;
  registrationPath: string;
}

export class ZionServer implements CliOpts<ConfigType> {
  private cliOptions: CliOptions;
  private cli: Cli<ConfigType> | null = null;

  constructor(options: CliOptions) {
    this.cliOptions = options;
    this.bridgeConfig = {
      defaults: {},
      affectsRegistration: true,
      schema: this.cliOptions.schema,
    };
  }

  public bridgeConfig: BridgeConfig | undefined;

  public get registrationPath(): string | undefined {
    return this.cliOptions.registrationPath;
  }

  public get enableRegistration(): boolean | undefined {
    return true;
  }

  public get enableLocalpart(): boolean | undefined {
    return true;
  }

  public get noUrl(): boolean | undefined {
    return undefined;
  }

  public setCliHook(cli: Cli<ConfigType>): void {
    this.cli = cli;
  }

  public onConfigChanged = (config: ConfigType): void => {
    console.log(`${PrintTag} onConfigChanged`, config);
  };

  public generateRegistration = (
    reg: AppServiceRegistration,
    callback: (finalReg: AppServiceRegistration) => void,
  ): void => {
    const config = this.cli?.getConfig() as IConfig | null;
    if (!config) {
      throw Error("Config is not available");
    }
    reg.setId(AppServiceRegistration.generateToken());
    reg.setHomeserverToken(AppServiceRegistration.generateToken());
    reg.setAppServiceToken(AppServiceRegistration.generateToken());
    reg.setSenderLocalpart("zionbot");
    reg.addRegexPattern(
      "users",
      `@${config.username_prefix}.*:${config.homeserver.server_name}`,
      true,
    );
    console.log(`${PrintTag} generateRegistration`, reg);
    callback(reg);
  };

  public run = async (
    port: number | null,
    rawConfig: ConfigType | null,
    registration: AppServiceRegistration | null,
  ): Promise<void> => {
    console.log(`${PrintTag} run`, port, rawConfig, registration);

    const config = rawConfig as IConfig | null;
    if (!config) {
      throw Error("Config not ready");
    }
    Logging.configure(config.logging || {});
    const log = Logging.get(LOGGER_NAME);
    // Format config
    if (!registration) {
      throw Error("registration must be defined");
    }

    const main = new Main(config, registration);
    try {
      const isRunning = await main.run(
        port ||
          config.homeserver.appservice_port ||
          this.cliOptions.defaultPort,
      );
      if (isRunning) {
        log.info("Zion bridge listening on port", port);
      } else {
        log.info("Zion bridge failed to start");
        process.exit(1);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
      log.error("Failed to start:", ex);
      process.exit(1);
    }

    process.on("SIGTERM", async () => {
      log.info("Got SIGTERM");
      try {
        await main.killBridge();
        process.exit(0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        log.warn("Failed to kill bridge, exiting anyway", ex);
        process.exit(2);
      }
    });
  };
}
