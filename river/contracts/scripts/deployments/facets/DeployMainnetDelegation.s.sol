// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {MainnetDelegation} from "contracts/src/tokens/river/base/delegation/MainnetDelegation.sol";

contract DeployMainnetDelegation is FacetHelper, Deployer {
  constructor() {
    addSelector(MainnetDelegation.setProxyDelegation.selector);
    addSelector(MainnetDelegation.setDelegation.selector);
    addSelector(MainnetDelegation.getDelegationByDelegator.selector);
    addSelector(MainnetDelegation.getMainnetDelegationsByOperator.selector);
    addSelector(MainnetDelegation.getDelegatedStakeByOperator.selector);
    addSelector(MainnetDelegation.setAuthorizedClaimer.selector);
    addSelector(MainnetDelegation.getAuthorizedClaimer.selector);
    addSelector(MainnetDelegation.setBatchDelegation.selector);
    addSelector(MainnetDelegation.setBatchAuthorizedClaimers.selector);
    addSelector(MainnetDelegation.getProxyDelegation.selector);
    addSelector(MainnetDelegation.getMessenger.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return MainnetDelegation.__MainnetDelegation_init.selector;
  }

  function makeInitData(address messenger) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), messenger);
    // 0xfdf649b20000000000000000000000004200000000000000000000000000000000000007 // Base Sepolia
  }

  function versionName() public pure override returns (string memory) {
    return "mainnetDelegation";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MainnetDelegation facet = new MainnetDelegation();
    vm.stopBroadcast();
    return address(facet);
  }
}
