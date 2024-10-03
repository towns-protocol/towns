// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

abstract contract DiamondHelper is IDiamond {
  string public name = "DiamondHelper";

  uint256 private _index = 0;

  FacetCut[] internal _cuts;
  address[] internal _initAddresses;
  bytes[] internal _initDatas;

  function addInit(address initAddress, bytes memory initData) internal {
    _initAddresses.push(initAddress);
    _initDatas.push(initData);
  }

  function addCut(FacetCut memory cut) internal {
    _cuts.push(cut);
  }

  function clearCuts() internal {
    delete _cuts;
  }

  function addFacet(
    FacetCut memory cut,
    address initAddress,
    bytes memory initData
  ) public {
    addCut(cut);
    addInit(initAddress, initData);
  }

  function getCuts() external view returns (FacetCut[] memory) {
    return _cuts;
  }

  function baseFacets() internal view returns (FacetCut[] memory) {
    return _cuts;
  }

  function _resetIndex() internal {
    _index = 0;
  }
}
