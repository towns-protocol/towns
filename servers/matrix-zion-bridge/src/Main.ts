import { AppServiceRegistration, RegexObj } from "matrix-appservice-bridge";
import {
  Appservice,
  AutojoinRoomsMixin,
  IAppserviceOptions,
  IAppserviceRegistration,
  IAppserviceStorageProvider,
  LogLevel,
  LogService,
  MemoryStorageProvider,
  RichConsoleLogger,
  SimpleRetryJoinStrategy,
} from "matrix-bot-sdk";

import { IConfig } from "./IConfig";
import { ZionBotController } from "./ZionBotController";

const PrintTag = "[Main]";

initializeLogService();

export class Main {
  private appService: Appservice;
  private storage: IAppserviceStorageProvider = new MemoryStorageProvider();
  private controller: ZionBotController;

  constructor(config: IConfig, registration: AppServiceRegistration) {
    const options: IAppserviceOptions = getAppserviceOptions(
      config,
      registration,
      this.storage
    );

    this.appService = new Appservice(options);
    AutojoinRoomsMixin.setupOnAppservice(this.appService);
    this.controller = new ZionBotController(this.appService, config);
  }

  public async startService(): Promise<void> {
    await this.appService.begin();
    LogService.info(`${PrintTag} Appservice started`);
  }

  public stopService(): void {
    this.appService.stop();
    LogService.info(`${PrintTag} Appservice stopped`);
  }
}

function getAppserviceOptions(
  config: IConfig,
  registration: AppServiceRegistration,
  storage: IAppserviceStorageProvider
): IAppserviceOptions {
  const port = getPort(registration.getAppServiceUrl());
  const options: IAppserviceOptions = {
    // Webserver options
    port: port ?? 9000,
    bindAddress: "0.0.0.0",

    // This should be the same URL used by the bot.
    homeserverUrl: config.homeserver.url,

    // The domain name of the homeserver. This is the part that is included in user IDs.
    homeserverName: config.homeserver.server_name,

    registration: getRegistration(registration),
    storage,

    // just to ensure reliable joins
    joinStrategy: new SimpleRetryJoinStrategy(),
  };
  return options;
}

function getRegistration(reg: AppServiceRegistration): IAppserviceRegistration {
  const registration: IAppserviceRegistration = {
    id: reg.getId() ?? "",
    as_token: reg.getAppServiceToken() ?? "",
    hs_token: reg.getHomeserverToken() ?? "",

    // not used by bot-sdk, define for documentation purposes
    url: reg.getAppServiceUrl() ?? "",

    sender_localpart: reg.getSenderLocalpart() ?? "",
    namespaces: getNamespaces(reg),

    // not used by bot-sdk, define for documentation purposes
    rate_limited: false,
    "de.sorunome.msc2409.push_ephemeral": true,
  };
  return registration;
}

interface Namespaces {
  aliases: RegexObj[];
  rooms: RegexObj[];
  users: RegexObj[];
}

function getNamespaces(reg: AppServiceRegistration): Namespaces {
  const rawReg = reg.getOutput();
  return {
    aliases: rawReg.namespaces?.aliases ?? [],
    rooms: rawReg.namespaces?.rooms ?? [],
    users: rawReg.namespaces?.users ?? [],
  };
}

function initializeLogService(): void {
  LogService.setLogger(new RichConsoleLogger());
  LogService.setLevel(LogLevel.TRACE);
  LogService.muteModule("Metrics");
  LogService.trace = LogService.debug;
}

function getPort(urlString: string | null): number | undefined {
  if (urlString) {
    const url = new URL(urlString);
    const port = parseInt(url.port);
    return isNaN(port) ? undefined : port;
  }

  return undefined;
}
