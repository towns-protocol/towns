import { Cli } from "matrix-appservice-bridge";
import { CliOptions } from "./AppserviceConfig";
import { ZionServer } from "./ZionServer";
import os from "os";

/**
 * matrix-appservice-bridge has very convoluted Cli commandline
 * processing. Hack it to make it work.
 */
let registrationPath = ".";

for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i].toLowerCase() === "-f" && i < process.argv.length - 1) {
    registrationPath = process.argv[i + 1];
    registrationPath = registrationPath.replace("~", os.homedir);
  }
}

const args: CliOptions = {
  councilNFTAddress: process.env.COUNCIL_NFT_ADDRESS ?? "",
  registrationPath,
  schema: `${__dirname}/zion-config-schema.yaml`,
  web3ProviderKey: process.env.INFURA_API_KEY ?? "",
  zionSpaceManagerAddress: process.env.ZION_SPACE_MANAGER_ADDRESS ?? "",
};

const zionServer = new ZionServer(args);
const cli = new Cli(zionServer);
zionServer.setCliHook(cli);

cli.run();
