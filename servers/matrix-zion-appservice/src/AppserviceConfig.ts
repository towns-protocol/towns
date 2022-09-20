export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerConfig {
  console?: LogLevel | "off";
  fileDatePattern?: string;
  timestampFormat?: string;
  files?: {
    [filename: string]: LogLevel | "off";
  };
  maxFiles?: number;
}

export interface CliOptions {
  registrationPath: string; // appservice config filename.
  schema: string; // appservice config file schema.
  web3ProviderKey: string; // API key for web3 infrastructure provider. E.g. Infura.
  councilNFTAddress: string; // CouncilNFT contract address on the blockchain
  zionSpaceManagerAddress: string; // ZionSpaceManager contract address on the blockchain
}

export interface AppserviceConfig {
  homeserver: {
    url: string;
    server_name: string;
    appservice_port?: number;
    appservice_host?: string;
  };
  logging: LoggerConfig;
  port: number; // appservice port
  registrationPath: string; // appservice config filename.
  schema: string; // appservice config file schema.
  username_prefix: string; // username regex in config file.
  councilNFTAddress: string; // CouncilNFT contract address on the blockchain
  web3ProviderKey: string; // API key for web3 infrastructure provider. E.g. Infura.
  zionSpaceManagerAddress: string; // ZionSpaceManager contract address on the blockchain
}
