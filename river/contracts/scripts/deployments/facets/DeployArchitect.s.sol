// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";

contract DeployArchitect is Deployer {
  function versionName() public pure override returns (string memory) {
    return "architectFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    Architect architect = new Architect();
    vm.stopBroadcast();
    return address(architect);
  }
}
