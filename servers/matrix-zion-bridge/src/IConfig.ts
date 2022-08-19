export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ILoggerConfig {
  console?: LogLevel | "off";
  fileDatePattern?: string;
  timestampFormat?: string;
  files?: {
    [filename: string]: LogLevel | "off";
  };
  maxFiles?: number;
}

export interface IConfig {
  domain: string;
  logging: ILoggerConfig;
  homeserver: {
    url: string;
    server_name: string;
    appservice_port?: number;
    appservice_host?: string;
  };
  homeserverUrl: string;
  username_prefix: string;
  web3ProviderKey: string;
}
