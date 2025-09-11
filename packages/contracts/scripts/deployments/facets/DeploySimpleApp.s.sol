// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {LibDeploy} from "@towns-protocol/diamond/src/utils/LibDeploy.sol";

library DeploySimpleApp {
    function deploy() internal returns (address) {
        return LibDeploy.deployCode("SimpleApp.sol", "");
    }
}
