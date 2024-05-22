// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Deployer} from "./Deployer.s.sol";

import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

abstract contract DiamondDeployer is Deployer {
  uint256 index = 0;

  IDiamond.FacetCut[] internal _cuts;
  address[] internal _initAddresses;
  bytes[] internal _initDatas;

  // override this with the actual deployment logic, no need to worry about:
  // - existing deployments
  // - loading private keys
  // - saving deployments
  // - logging
  function diamondInitParams(
    address deployer
  ) public virtual returns (Diamond.InitParams memory);

  // override hook that gets called in Deployer.s.sol so it deploys a diamond instead of a regular contract
  function __deploy(address deployer) public override returns (address) {
    // call diamond params hook
    Diamond.InitParams memory initParams = diamondInitParams(deployer);

    // deploy diamond and return address
    vm.broadcast(deployer);
    return address(new Diamond(initParams));
  }

  function addInit(address initAddress, bytes memory initData) internal {
    _initAddresses.push(initAddress);
    _initDatas.push(initData);
  }

  function addCut(IDiamond.FacetCut memory cut) internal {
    _cuts.push(cut);
  }

  function addFacet(
    IDiamond.FacetCut memory cut,
    address initAddress,
    bytes memory initData
  ) internal {
    addCut(cut);
    addInit(initAddress, initData);
  }

  function baseFacets() internal view returns (IDiamond.FacetCut[] memory) {
    return _cuts;
  }

  function _resetIndex() internal {
    index = 0;
  }
}
