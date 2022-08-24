<h2>Zion Governance</h2>

<h3>Requirements</h3>

Install [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)\
`npm install --global yarn`

Download [Foundry](https://github.com/foundry-rs/foundry)\
`curl -L https://foundry.paradigm.xyz | bash`

Then after reloading PATH, to install it run:\
`foundryup`

If you see a warning about libusb, install it by running:\
`brew install libusb`

<br>

<h3>Project setup</h3>

Clone the repo\
Run `yarn`

<b>To compile the smart contracts located in `/contracts`:</b>\
 Run `forge build`\
 Compiled contracts will be output to the `/artifacts` folder

<b>To run the solidity unit tests:</b>\
 Run `forge test`\
 You can add verbosity to the tests by adding `-vvvv` (1-4 levels) to the command

<b>To run the front end:</b>\
 Run `yarn start`\
 And visit http://localhost:3000

<b>To start a local ethereum blockchain:</b>\
 Run `anvil`\
 It will generate a set of 10 public/private keys with 10k ether each. Save one of these private keys for deployment below.\
 It starts listening on `http://127.0.0.1:8545`\
 If you want to interact with anvil via the front end, you will need to add the local network to Metamask with `ChainID=1337`

<b>To deploy the compiled contracts to the local network:</b>\
 Solidity deploy scripts are located in `/script`\
 Add a `.env` file to the root of the project (this is excluded from git via .gitignore) with the following fields (RPC URLs may need modified)

```
MAINNET_RPC_URL=https://cloudflare-eth.com/
LOCAL_RPC_URL=http://127.0.0.1:8545
RINKEBY_RPC_URL=https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161
LOCAL_PRIVATE_KEY=[YOUR PRIVATE KEY]
RINKEBY_PRIVATE_KEY=[YOUR PRIVATE KEY]
ETHERSCAN_KEY=[YOUR ETHERSCAN KEY]
```

First pull in the `.env`:\
 Run `source .env`\
 Then Run:\
 `forge script [PATH TO DEPLOY SCRIPT] --rpc-url $LOCAL_RPC_URL --private-key $LOCAL_PRIVATE_KEY --broadcast -vvvv`
For example: \
`forge script scripts/foundry/deploy-space-manager.s.sol --rpc-url $LOCAL_RPC_URL --private-key $LOCAL_PRIVATE_KEY --broadcast -vvvv`

Finally update the front-end files with the correct addresses of the deployed contracts
