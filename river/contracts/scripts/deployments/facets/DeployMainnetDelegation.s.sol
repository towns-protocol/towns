// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";

contract DeployMainnetDelegation is FacetHelper, Deployer {
  constructor() {
    addSelector(MainnetDelegation.setDelegation.selector);
    addSelector(MainnetDelegation.removeDelegation.selector);
    addSelector(MainnetDelegation.getDelegationByDelegator.selector);
    addSelector(MainnetDelegation.getDelegationsByOperator.selector);
    addSelector(MainnetDelegation.getDelegatedStakeByOperator.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return MainnetDelegation.__MainnetDelegation_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "mainnetDelegation";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    MainnetDelegation facet = new MainnetDelegation();
    vm.stopBroadcast();
    return address(facet);
  }
}
