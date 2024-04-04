// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {RiverConfig} from "contracts/src/river/registry/facets/config/RiverConfig.sol";

contract RiverConfigHelper is FacetHelper {
  constructor() {
    addSelector(RiverConfig.configurationExists.selector);
    addSelector(RiverConfig.setConfiguration.selector);
    addSelector(RiverConfig.deleteConfiguration.selector);
    addSelector(RiverConfig.deleteConfigurationOnBlock.selector);
    addSelector(RiverConfig.getConfiguration.selector);
    addSelector(RiverConfig.getAllConfiguration.selector);
    addSelector(RiverConfig.isConfigurationManager.selector);
    addSelector(RiverConfig.approveConfigurationManager.selector);
    addSelector(RiverConfig.removeConfigurationManager.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return RiverConfig.__RiverConfig_init.selector;
  }

  function makeInitData(
    address[] calldata configManagers
  ) public pure returns (bytes memory) {
    return abi.encodeWithSelector(initializer(), configManagers);
  }
}
