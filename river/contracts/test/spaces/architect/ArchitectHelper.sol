// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// contracts
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract ArchitectHelper is FacetHelper {
  constructor() {
    addSelector(Architect.getSpaceByTokenId.selector);
    addSelector(Architect.getTokenIdBySpace.selector);
    addSelector(Architect.setSpaceArchitectImplementations.selector);
    addSelector(Architect.getSpaceArchitectImplementations.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return Architect.__Architect_init.selector;
  }

  function makeInitData(
    address _spaceOwnerToken,
    address _userEntitlement,
    address _ruleEntitlement,
    address _walletLink
  ) public pure returns (bytes memory) {
    return
      abi.encodeWithSelector(
        initializer(),
        _spaceOwnerToken,
        _userEntitlement,
        _ruleEntitlement,
        _walletLink
      );
  }
}
