// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

import {CreateSpaceFacet} from "contracts/src/factory/facets/create/CreateSpace.sol";

contract DeployCreateSpace is FacetHelper, Deployer {
  constructor() {
    addSelector(CreateSpaceFacet.createSpace.selector);
    addSelector(
      bytes4(
        keccak256(
          "createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes,bool),string[]),(string),(uint256)))"
        )
      )
    );
    addSelector(
      bytes4(
        keccak256(
          "createSpaceWithPrepay(((string,string,string,string),((string,string,uint256,uint256,uint64,address,address,uint256,address),(bool,address[],bytes),string[]),(string),(uint256)))"
        )
      )
    );
    addSelector(CreateSpaceFacet.createSpaceV2.selector);
  }

  function initializer() public pure override returns (bytes4) {
    return CreateSpaceFacet.__CreateSpace_init.selector;
  }

  function versionName() public pure override returns (string memory) {
    return "facets/createSpaceFacet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    CreateSpaceFacet facet = new CreateSpaceFacet();
    vm.stopBroadcast();
    return address(facet);
  }
}
