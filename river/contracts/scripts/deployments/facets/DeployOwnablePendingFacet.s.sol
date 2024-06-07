// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {OwnablePendingFacet} from "./../../../src/diamond/facets/ownable/pending/OwnablePendingFacet.sol";

contract DeployOwnablePendingFacet is FacetHelper, Deployer {
  constructor() {
    addSelector(OwnablePendingFacet.startTransferOwnership.selector);
    addSelector(OwnablePendingFacet.acceptOwnership.selector);
    addSelector(OwnablePendingFacet.currentOwner.selector);
    addSelector(OwnablePendingFacet.pendingOwner.selector);
  }

  function versionName() public pure override returns (string memory) {
    return "ownablePendingFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    OwnablePendingFacet facet = new OwnablePendingFacet();
    vm.stopBroadcast();
    return address(facet);
  }

  function initializer() public pure override returns (bytes4) {
    return OwnablePendingFacet.__OwnablePending_init.selector;
  }

  function makeInitData(address owner) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        OwnablePendingFacet.__OwnablePending_init.selector,
        owner
      );
  }
}
