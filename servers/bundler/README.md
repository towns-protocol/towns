This clones eth-infinitism reference bundler, at https://github.com/eth-infinitism/bundler.git. This mostly seems incompatible with userop.js as simple transactions like sending eth still fail.

Long term we may be able to implement the stackup bundler, if they add the ability to turn off custom tracing, or if anvil adds support for custom tracing. Or we have to use a geth node.

`sh run-bundler.sh` will run the bundler in a docker container, available at http:localhost:4337/rpc.
