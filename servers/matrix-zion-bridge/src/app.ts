import { Cli } from "matrix-appservice-bridge";
import { ZionServer } from "./ZionServer";

const zionServer = new ZionServer({
  defaultPort: 6868,
  registrationPath: "zion-registration.yaml",
  schema: "zion-config-schema.yaml",
});

const cli = new Cli(zionServer);
zionServer.setCliHook(cli);

cli.run();
