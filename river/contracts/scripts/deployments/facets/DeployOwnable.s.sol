// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {OwnableFacet} from "contracts/src/diamond/facets/ownable/OwnableFacet.sol";

contract DeployOwnable is FacetHelper, Deployer {
  constructor() {
    addSelector(OwnableFacet.owner.selector);
    addSelector(OwnableFacet.transferOwnership.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "ownableFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    OwnableFacet facet = new OwnableFacet();
    vm.stopBroadcast();
    return address(facet);
  }

  function initializer() public pure override returns (bytes4) {
    return OwnableFacet.__Ownable_init.selector;
  }

  function makeInitData(address owner) public pure returns (bytes memory) {
    return abi.encodeWithSelector(OwnableFacet.__Ownable_init.selector, owner);
  }
}
