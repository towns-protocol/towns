// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "scripts/common/Deployer.s.sol";
import {RuleEntitlement} from "src/spaces/entitlements/rule/RuleEntitlement.sol";

contract DeployRuleEntitlement is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/ruleEntitlement";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.broadcast(deployer);
        return address(new RuleEntitlement());
    }
}
