// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {Deployer} from "./Deployer.s.sol";

import {Diamond} from "contracts/src/diamond/Diamond.sol";

abstract contract DiamondDeployer is Deployer {
  uint256 index = 0;

  // override this with the actual deployment logic, no need to worry about:
  // - existing deployments
  // - loading private keys
  // - saving deployments
  // - logging
  function diamondInitParams(
    uint256 deployerPrivateKey,
    address deployer
  ) public virtual returns (Diamond.InitParams memory);

  // override hook that gets called in Deployer.s.sol so it deploys a diamond instead of a regular contract
  function __deploy(
    uint256 deployerPrivateKey,
    address deployer
  ) public override returns (address) {
    // call diamond params hook
    Diamond.InitParams memory initParams = diamondInitParams(
      deployerPrivateKey,
      deployer
    );

    // deploy diamond and return address
    vm.broadcast(deployerPrivateKey);
    return address(new Diamond(initParams));
  }

  function _resetIndex() internal {
    index = 0;
  }
}
