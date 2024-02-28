// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {MembershipFacet} from "contracts/src/spaces/facets/membership/MembershipFacet.sol";

contract DeployMembership is Deployer {
  function versionName() public pure override returns (string memory) {
    return "membershipFacet";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    address membership = address(new MembershipFacet());
    vm.stopBroadcast();

    return membership;
  }
}
