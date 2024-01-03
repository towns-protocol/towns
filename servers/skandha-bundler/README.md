This clones the skandha bundler, at https://github.com/etherspot/skandha. This is probably a better option than the eth-infinitism bundler, as it supports a `--redirectRpc` flag https://github.com/etherspot/skandha?tab=readme-ov-file#-additional-features, which "is needed if you use UserOp.js". Simple tx like sending eth are successful. But interacting with towns contracts are not.

Long term we may be able to implement the stackup bundler, if they add the ability to turn off custom tracing, or if anvil adds support for custom tracing. Or we have to use a geth node.

`sh run-bundler.sh` will run the bundler in a docker container, available at http:localhost:14337/31337.
