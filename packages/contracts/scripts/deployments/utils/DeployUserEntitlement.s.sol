// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "scripts/common/Deployer.s.sol";
import {UserEntitlement} from "src/spaces/entitlements/user/UserEntitlement.sol";

contract DeployUserEntitlement is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/userEntitlement";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.broadcast(deployer);
        return address(new UserEntitlement());
    }
}
