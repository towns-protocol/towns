// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {PrepayFacet} from "contracts/src/factory/facets/prepay/PrepayFacet.sol";

contract DeployPrepayFacet is FacetHelper, Deployer {
  constructor() {
    addSelector(PrepayFacet.prepayMembership.selector);
    addSelector(PrepayFacet.prepaidMembershipSupply.selector);
    addSelector(PrepayFacet.calculateMembershipPrepayFee.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return PrepayFacet.__PrepayFacet_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "prepayFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    PrepayFacet facet = new PrepayFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
