// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ITownArchitect} from "contracts/src/towns/facets/architect/ITownArchitect.sol";

// contracts
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";
import {TownArchitect} from "contracts/src/towns/facets/architect/TownArchitect.sol";

contract TownArchitectHelper is FacetHelper {
  TownArchitect internal townArchitect;

  constructor() {
    townArchitect = new TownArchitect();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](11);

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
    selectors_[index++] = ITownArchitect.getTokenIdByTown.selector;
    selectors_[index++] = ITownArchitect.isTown.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(townArchitect);
  }

  function initializer() public pure override returns (bytes4) {
    return TownArchitect.__TownArchitect_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
  }

  function makeInitData(
    address _townOwnerToken,
    address _userEntitlement,
    address _tokenEntitlement
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        TownArchitect.__TownArchitect_init.selector,
        _townOwnerToken,
        _userEntitlement,
        _tokenEntitlement
      );
  }
}
