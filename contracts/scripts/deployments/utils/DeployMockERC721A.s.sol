// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";
import {MockERC721A} from "contracts/test/mocks/MockERC721A.sol";

import {DeployERC721A} from "contracts/scripts/deployments/facets/DeployERC721A.s.sol";

contract DeployMockERC721A is Deployer, FacetHelper {
  DeployERC721A deployERC721A = new DeployERC721A();

  function versionName() public pure override returns (string memory) {
    return "utils/mockERC721A";
  }

  constructor() {
    addSelector(MockERC721A.mintTo.selector);
    addSelector(MockERC721A.mint.selector);
    addSelector(MockERC721A.burn.selector);
    addSelectors(deployERC721A.selectors());
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    MockERC721A deployment = new MockERC721A();
    vm.stopBroadcast();

    return address(deployment);
  }
}
