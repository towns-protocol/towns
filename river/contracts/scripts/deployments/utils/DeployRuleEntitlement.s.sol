// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";

import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";
import {RuleEntitlementV2} from "contracts/src/spaces/entitlements/rule/RuleEntitlementV2.sol";

contract DeployRuleEntitlement is Deployer {
  function versionName() public pure override returns (string memory) {
    return "ruleEntitlement";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new RuleEntitlement());
  }
}

contract DeployRuleEntitlementV2 is Deployer {
  function versionName() public pure override returns (string memory) {
    return "ruleEntitlementV2";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new RuleEntitlementV2());
  }
}
