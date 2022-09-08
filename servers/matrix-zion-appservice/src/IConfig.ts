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
  logging: ILoggerConfig;
  homeserver: {
    url: string;
    server_name: string;
    appservice_port?: number;
    appservice_host?: string;
  };
  username_prefix: string;
  web3ProviderKey: string; // API key for web3 infrastructure provider. E.g. Infura.
  councilNFTAddress: string; // CouncilNFT contract address on the blockchain
  zionSpaceManagerAddress: string; // ZionSpaceManager contract address on the blockchain
}
