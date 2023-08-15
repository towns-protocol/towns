// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond, Diamond} from "contracts/src/diamond/Diamond.sol";

//libraries

//contracts
import {Deployer} from "./common/Deployer.s.sol";
import {Delegation} from "contracts/src/towns/facets/delegation/Delegation.sol";

import {DelegationHelper} from "contracts/test/towns/delegation/DelegationSetup.sol";

contract DeployDelegations is Deployer {
  DelegationHelper delegationHelper = new DelegationHelper();

  address delegation;

  function versionName() public pure override returns (string memory) {
    return "delegation";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    vm.startBroadcast(deployerPK);
    delegation = address(new Delegation());
    vm.stopBroadcast();

    IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
    uint256 index;

    cuts[index++] = delegationHelper.makeCut(
      delegation,
      IDiamond.FacetCutAction.Add
    );

    vm.startBroadcast(deployerPK);
    address delegationAddress = address(
      new Diamond(
        Diamond.InitParams({
          baseFacets: cuts,
          init: delegation,
          initData: delegationHelper.makeInitData("")
        })
      )
    );
    vm.stopBroadcast();

    return delegationAddress;
  }
}
