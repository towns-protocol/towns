// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {TownOwner} from "contracts/src/towns/facets/owner/TownOwner.sol";

contract TownOwnerHelper is FacetHelper {
  TownOwner internal townOwner;

  constructor() {
    townOwner = new TownOwner();

    bytes4[] memory selectors_ = new bytes4[](6);
    uint256 index;

    // TownOwner
    selectors_[index++] = TownOwner.setFactory.selector;
    selectors_[index++] = TownOwner.getFactory.selector;
    selectors_[index++] = TownOwner.mintTown.selector;
    selectors_[index++] = TownOwner.getTownInfo.selector;
    selectors_[index++] = TownOwner.nextTokenId.selector;
    selectors_[index++] = TownOwner.updateTownInfo.selector;
    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(townOwner);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function initializer() public view virtual override returns (bytes4) {
    return townOwner.__TownOwner_init.selector;
  }

  function makeInitData(
    string memory name,
    string memory symbol,
    string memory version
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        TownOwner.__TownOwner_init.selector,
        name,
        symbol,
        version
      );
  }
}
