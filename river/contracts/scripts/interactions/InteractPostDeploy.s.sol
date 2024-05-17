// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IImplementationRegistry} from "./../../src/factory/facets/registry/IImplementationRegistry.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

// deployments
import {DeploySpaceOwner} from "contracts/scripts/deployments/DeploySpaceOwner.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/DeployBaseRegistry.s.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/DeployRiverBase.s.sol";
import {DeployProxyDelegation} from "contracts/scripts/deployments/DeployProxyDelegation.s.sol";

contract InteractPostDeploy is Interaction {
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeployRiverBase deployRiverBaseToken = new DeployRiverBase();
  DeployProxyDelegation deployProxyDelegation = new DeployProxyDelegation();

  function __interact(uint256 pk, address) public override {
    address spaceOwner = deploySpaceOwner.deploy();
    address spaceFactory = deploySpaceFactory.deploy();
    address baseRegistry = deployBaseRegistry.deploy();
    address riverBaseToken = deployRiverBaseToken.deploy();
    address mainnetProxyDelegation = deployProxyDelegation.deploy();

    vm.startBroadcast(pk);
    ISpaceOwner(spaceOwner).setFactory(spaceFactory);
    IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
    SpaceDelegationFacet(baseRegistry).setRiverToken(riverBaseToken);
    IMainnetDelegation(baseRegistry).setProxyDelegation(mainnetProxyDelegation);
    vm.stopBroadcast();
  }
}
