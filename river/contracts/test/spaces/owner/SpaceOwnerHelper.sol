// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";

contract SpaceOwnerHelper is FacetHelper {
  SpaceOwner internal spaceOwner;

  constructor() {
    spaceOwner = new SpaceOwner();

    bytes4[] memory selectors_ = new bytes4[](6);
    uint256 index;

    // SpaceOwner
    selectors_[index++] = SpaceOwner.setFactory.selector;
    selectors_[index++] = SpaceOwner.getFactory.selector;
    selectors_[index++] = SpaceOwner.mintSpace.selector;
    selectors_[index++] = SpaceOwner.getSpaceInfo.selector;
    selectors_[index++] = SpaceOwner.nextTokenId.selector;
    selectors_[index++] = SpaceOwner.updateSpaceInfo.selector;
    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(spaceOwner);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public view virtual override returns (bytes4) {
    return SpaceOwner.__SpaceOwner_init.selector;
  }

  function makeInitData(
    string memory name,
    string memory symbol,
    string memory version
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        SpaceOwner.__SpaceOwner_init.selector,
        name,
        symbol,
        version
      );
  }
}
