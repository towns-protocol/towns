// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IImplementationRegistry} from "./../../src/factory/facets/registry/IImplementationRegistry.sol";
import {IMainnetDelegation} from "contracts/src/tokens/river/base/delegation/IMainnetDelegation.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {River} from "contracts/src/tokens/river/base/River.sol";
import {MAX_CLAIMABLE_SUPPLY} from "./InteractClaimCondition.s.sol";

// deployments
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/utils/DeployRiverBase.s.sol";
import {DeployProxyBatchDelegation} from "contracts/scripts/deployments/utils/DeployProxyBatchDelegation.s.sol";
import {DeployRiverAirdrop} from "contracts/scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";

contract InteractPostDeploy is Interaction {
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeployRiverBase deployRiverBaseToken = new DeployRiverBase();
  DeployProxyBatchDelegation deployProxyDelegation =
    new DeployProxyBatchDelegation();
  DeployRiverAirdrop deployRiverAirdrop = new DeployRiverAirdrop();

  function __interact(address deployer) internal override {
    address spaceOwner = deploySpaceOwner.deploy(deployer);
    address spaceFactory = deploySpaceFactory.deploy(deployer);
    address baseRegistry = deployBaseRegistry.deploy(deployer);
    address riverBaseToken = deployRiverBaseToken.deploy(deployer);
    address mainnetProxyDelegation = deployProxyDelegation.deploy(deployer);
    address riverAirdrop = deployRiverAirdrop.deploy(deployer);

    vm.startBroadcast(deployer);
    // this is for anvil deployment only
    River(riverBaseToken).mint(riverAirdrop, MAX_CLAIMABLE_SUPPLY);
    ISpaceOwner(spaceOwner).setFactory(spaceFactory);
    IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
    IImplementationRegistry(spaceFactory).addImplementation(riverAirdrop);
    SpaceDelegationFacet(baseRegistry).setRiverToken(riverBaseToken);
    IMainnetDelegation(baseRegistry).setProxyDelegation(mainnetProxyDelegation);
    vm.stopBroadcast();
  }
}
