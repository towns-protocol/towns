// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// contracts
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract ArchitectHelper is FacetHelper {
  Architect internal architect;

  constructor() {
    architect = new Architect();

    uint256 index;
    bytes4[] memory selectors_ = new bytes4[](5);

    selectors_[index++] = Architect.getSpaceByTokenId.selector;
    selectors_[index++] = Architect.getTokenIdBySpace.selector;
    selectors_[index++] = Architect.createSpace.selector;
    selectors_[index++] = Architect.setSpaceArchitectImplementations.selector;
    selectors_[index++] = Architect.getSpaceArchitectImplementations.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(architect);
  }

  function initializer() public pure override returns (bytes4) {
    return Architect.__Architect_init.selector;
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
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
