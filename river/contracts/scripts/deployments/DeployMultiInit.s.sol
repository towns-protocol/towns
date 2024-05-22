// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {MultiInit} from "contracts/src/diamond/initializers/MultiInit.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployMultiInit is Deployer, FacetHelper {
  function versionName() public pure override returns (string memory) {
    return "multiInit";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new MultiInit());
  }

  function makeInitData(
    address[] memory initAddresses,
    bytes[] memory initDatas
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        MultiInit.multiInit.selector,
        initAddresses,
        initDatas
      );
  }
}
