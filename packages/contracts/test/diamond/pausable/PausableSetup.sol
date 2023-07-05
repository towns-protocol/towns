// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";

// libraries

// contracts
import {FacetHelper, FacetTest} from "contracts/test/diamond/Facet.t.sol";
import {Pausable} from "contracts/src/diamond/facets/pausable/Pausable.sol";

abstract contract PausableSetup is FacetTest {
  PausableHelper internal pausableHelper;
  Pausable internal pausable;

  function setUp() public override {
    super.setUp();

    pausableHelper = new PausableHelper();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    cuts[0] = pausableHelper.makeCut(IDiamond.FacetCutAction.Add);

    IDiamondCut(diamond).diamondCut(cuts, address(0), "");

    pausable = Pausable(diamond);
  }
}

contract PausableHelper is FacetHelper {
  Pausable internal pausable;

  constructor() {
    pausable = new Pausable();
  }

  function facet() public view override returns (address) {
    return address(pausable);
  }

  function selectors() public view override returns (bytes4[] memory) {
    bytes4[] memory selectors_ = new bytes4[](3);
    selectors_[0] = pausable.pause.selector;
    selectors_[1] = pausable.unpause.selector;
    selectors_[2] = pausable.paused.selector;
    return selectors_;
  }

  function initializer() public pure override returns (bytes4) {
    return "";
  }

  function makeInitData(
    bytes memory initData
  ) public view override returns (address, bytes memory data) {
    address proxyImplementation = abi.decode(initData, (address));

    return (
      facet(),
      abi.encodeWithSelector(initializer(), proxyImplementation)
    );
  }
}
