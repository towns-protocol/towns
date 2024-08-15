# River's image retrieval service

Fetches river images from river streams.

## Local development

Start the river image service:

```bash
# make sure the river chain is running, and the contracts are deployed.
# check that the deployed contract addresses and abis are generated.
#
# Look for these dependencies:
# - packages/generated/config/deployments.json
# - packages/generated/dev/abis/NodeRegistry.abi.ts
# - packages/generated/dev/abis/StreamRegistry.abi.ts
#
# if the dependencies are not present, run:
# ./<projectRoot>/scripts/start_dev.sh

cp .env.local.sample .env.local
yarn dev
```
