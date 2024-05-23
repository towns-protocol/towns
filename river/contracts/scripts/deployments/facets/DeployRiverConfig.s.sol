// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {RiverConfig} from "contracts/src/river/registry/facets/config/RiverConfig.sol";
import {FacetHelper} from "contracts/test/diamond/Facet.t.sol";

contract DeployRiverConfig is FacetHelper, Deployer {
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

  function versionName() public pure override returns (string memory) {
    return "riverConfigFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    RiverConfig riverConfig = new RiverConfig();
    vm.stopBroadcast();
    return address(riverConfig);
  }
}
