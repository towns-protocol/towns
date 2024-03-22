// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Banning} from "contracts/src/spaces/facets/banning/Banning.sol";

contract DeployBanning is Deployer {
  function versionName() public pure override returns (string memory) {
    return "banningFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    bytes32 salt = bytes32(uint256(deployerPK));

    vm.startBroadcast(deployerPK);
    Banning banning = new Banning{salt: salt}();
    vm.stopBroadcast();
    return address(banning);
  }
}
