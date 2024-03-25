// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// helpers
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

// contracts
import {RiverConfig} from "contracts/src/river/registry/facets/config/RiverConfig.sol";

contract RiverConfigHelper is FacetHelper {
  RiverConfig internal config;

  constructor() {
    config = new RiverConfig();

    bytes4[] memory selectors_ = new bytes4[](9);
    selectors_[_index++] = RiverConfig.configurationExists.selector;
    selectors_[_index++] = RiverConfig.setConfiguration.selector;
    selectors_[_index++] = RiverConfig.deleteConfiguration.selector;
    selectors_[_index++] = RiverConfig.deleteConfigurationOnBlock.selector;
    selectors_[_index++] = RiverConfig.getConfiguration.selector;
    selectors_[_index++] = RiverConfig.getAllConfiguration.selector;
    selectors_[_index++] = RiverConfig.isConfigurationManager.selector;
    selectors_[_index++] = RiverConfig.approveConfigurationManager.selector;
    selectors_[_index++] = RiverConfig.removeConfigurationManager.selector;

    addSelectors(selectors_);
  }

  function facet() public view override returns (address) {
    return address(config);
  }

  function selectors() public view override returns (bytes4[] memory) {
    return functionSelectors;
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
