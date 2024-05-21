// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "../common/Deployer.s.sol";

import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";

contract DeployRuleEntitlement is Deployer {
  function versionName() public pure override returns (string memory) {
    return "ruleEntitlement";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.broadcast(deployerPK);
    return address(new RuleEntitlement());
  }
}
