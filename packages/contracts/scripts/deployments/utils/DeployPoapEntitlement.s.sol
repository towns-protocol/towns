// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "scripts/common/Deployer.s.sol";
import {PoapEntitlement} from "src/spaces/entitlements/poap/PoapEntitlement.sol";

contract DeployPoapEntitlement is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/poapEntitlement";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.broadcast(deployer);
        return address(new PoapEntitlement(0x22C1f6050E56d2876009903609a2cC3fEf83B415));
    }
}
