import { Cli } from "matrix-appservice-bridge";
import { ZionCliOpts } from "./ZionCliOpts";

const cli = new Cli(
  new ZionCliOpts({
    defaultPort: 6868,
    registrationFilename: "zion-registration.yaml",
    schema: "zion-config-schema.yaml",
  })
);
cli.run();
