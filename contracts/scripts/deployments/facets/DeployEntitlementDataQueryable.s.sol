// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {EntitlementDataQueryable} from
  "contracts/src/spaces/facets/entitlements/extensions/EntitlementDataQueryable.sol";

contract DeployEntitlementDataQueryable is Deployer, FacetHelper {
  // FacetHelper
  constructor() {
    addSelector(EntitlementDataQueryable.getEntitlementDataByPermission.selector);
    addSelector(EntitlementDataQueryable.getChannelEntitlementDataByPermission.selector);
    addSelector(EntitlementDataQueryable.getCrossChainEntitlementData.selector);
  }

  // Deploying
  function versionName() public pure override returns (string memory) {
    return "facets/entitlementDataQueryableFacet";
  }

  function __deploy(
    address deployer
  ) public override returns (address) {
    vm.startBroadcast(deployer);
    EntitlementDataQueryable facet = new EntitlementDataQueryable();
    vm.stopBroadcast();
    return address(facet);
  }
}
