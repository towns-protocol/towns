// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

import {ITownArchitect, ITownArchitectStructs} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract TownArchitectHelper is FacetHelper {
  TownArchitect internal townArchitect;

  constructor() {
    townArchitect = new TownArchitect();
  }

  function facet() public view override returns (address) {
    return address(townArchitect);
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }

  function selectors()
    public
    pure
    override
    returns (bytes4[] memory selectors_)
  {
    selectors_ = new bytes4[](9);

    uint256 index;
    selectors_[index++] = ITownArchitect.createTown.selector;
    selectors_[index++] = ITownArchitect.computeTown.selector;
    selectors_[index++] = ITownArchitect
      .getTownArchitectImplementations
      .selector;
    selectors_[index++] = ITownArchitect
      .setTownArchitectImplementations
      .selector;
    selectors_[index++] = ITownArchitect.getTownById.selector;
    selectors_[index++] = ITownArchitect.getTokenIdByTownId.selector;
    selectors_[index++] = ITownArchitect.gateByToken.selector;
    selectors_[index++] = ITownArchitect.ungateByToken.selector;
    selectors_[index++] = ITownArchitect.isTokenGated.selector;
  }
}
