This Docker is essentially the same image as stackupwallet/go-ethereum, but is modifies the go-etheruem build to change the hardcoded chain id for --dev mode to 31337, to be compatible with our default anvil base chain.
Following instructions in https://github.com/stackup-wallet/erc-4337-execution-client-builder.git, it builds the go-ethereum client from source with stackup's custom tracers, which are needed to run the rest of stackup's devnet.


To publish this image to Docker Hub, you need to enable Docker Buildx and create a new builder instance. You can do this by running the following commands:

```bash
docker buildx create --name mybuilder --use
docker buildx inspect mybuilder --bootstrap

docker buildx build --platform linux/amd64,linux/arm64 -t evanhnt/stackup-go-ethereum:latest --push .
```