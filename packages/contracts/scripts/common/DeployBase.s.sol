// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {DeployBase as _DeployBase} from "@towns-protocol/diamond/scripts/common/DeployBase.s.sol";

abstract contract DeployBase is _DeployBase {
    constructor() {
        // set up chains
        setChain(
            "river",
            ChainData({name: "river", chainId: 550, rpcUrl: "https://mainnet.rpc.river.build/http"})
        );
        setChain(
            "river_anvil",
            ChainData({name: "river_anvil", chainId: 31_338, rpcUrl: "http://localhost:8546"})
        );
        setChain(
            "river_devnet",
            ChainData({
                name: "river_devnet",
                chainId: 6_524_490,
                rpcUrl: "https://devnet.rpc.river.build"
            })
        );
    }
}
