// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDiamond} from "contracts/src/diamond/Diamond.sol";
import {IDiamondCut} from "contracts/src/diamond/facets/cut/IDiamondCut.sol";
import {IProxyManager} from "contracts/src/diamond/proxy/manager/IProxyManager.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

// space updates
import {DeploySpace} from "contracts/scripts/deployments/DeploySpace.s.sol";

// debuggging
import {console} from "forge-std/console.sol";

contract Migration_2024_05_01 is Interaction {
  DeploySpace spaceHelper = new DeploySpace();

  function __interact(address deployer) public override {
    address spaceManager = getDeployment("spaceFactory");
    address space = spaceHelper.deploy();

    vm.startBroadcast(deployer);
    IProxyManager(spaceManager).setImplementation(space);
    vm.stopBroadcast();

    console.log("Migration_2024_05_01: done!");
  }
}
