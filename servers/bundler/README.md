This clones a forked version of the eth-infinitism reference bundler, at https://github.com/HereNotThere/eth-infinitism-bundler. Changes are on `evan/anvil-compat` branch. Changes are made to allow bundler to run in --unsafe mode and bypass simulating validation, which results in failure when used with userop.js. Stackup's own bundler (https://github.com/stackup-wallet/stackup-bundler) does not result in a failure with userop.js, however it does require a geth node which allows for custom tracing - something that anvil currently does not support.

Long term we may be able to implement the stackup bundler, if they add the ability to turn off custom tracing, or if anvil adds support for custom tracing.

`sh run-bundler.sh` will run the bundler in a docker container, available at http:localhost:4337/rpc.
