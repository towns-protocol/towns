// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {AccessControlListFacet} from "contracts/src/node/acl/AccessControlListFacet.sol";

contract AccessControlListHelper is FacetHelper {
  AccessControlListFacet internal accessControlList;

  constructor() {
    accessControlList = new AccessControlListFacet();
  }

  function facet() public view override returns (address) {
    return address(accessControlList);
  }

  function selectors() public pure override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](4);
    selectors_[0] = AccessControlListFacet.addToAllowlist.selector;
    selectors_[1] = AccessControlListFacet.removeFromAllowlist.selector;
    selectors_[2] = AccessControlListFacet.addToBlocklist.selector;
    selectors_[3] = AccessControlListFacet.accessControlStatus.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return AccessControlListFacet.__AccessControlListFacet_init.selector;
  }
}
