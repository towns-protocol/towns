// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {SimpleApp} from "src/apps/helpers/SimpleApp.sol";

library DeploySimpleApp {
    function deploy() internal returns (address) {
        return address(new SimpleApp());
    }
}
