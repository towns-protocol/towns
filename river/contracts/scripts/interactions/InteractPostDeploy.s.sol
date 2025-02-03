// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IImplementationRegistry} from "./../../src/factory/facets/registry/IImplementationRegistry.sol";
import {IMainnetDelegation} from "contracts/src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {SpaceDelegationFacet} from "contracts/src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

// libraries

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";
import {MockTowns} from "contracts/test/mocks/MockTowns.sol";
import {MAX_CLAIMABLE_SUPPLY} from "./InteractClaimCondition.s.sol";

// deployments
import {DeploySpaceOwner} from "contracts/scripts/deployments/diamonds/DeploySpaceOwner.s.sol";
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeployTownsBase} from "contracts/scripts/deployments/utils/DeployTownsBase.s.sol";
import {DeployProxyBatchDelegation} from "contracts/scripts/deployments/utils/DeployProxyBatchDelegation.s.sol";
import {DeployRiverAirdrop} from "contracts/scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";

contract InteractPostDeploy is Interaction {
  DeploySpaceOwner deploySpaceOwner = new DeploySpaceOwner();
  DeploySpaceFactory deploySpaceFactory = new DeploySpaceFactory();
  DeployBaseRegistry deployBaseRegistry = new DeployBaseRegistry();
  DeployTownsBase deployTownsBase = new DeployTownsBase();
  DeployProxyBatchDelegation deployProxyDelegation =
    new DeployProxyBatchDelegation();
  DeployRiverAirdrop deployRiverAirdrop = new DeployRiverAirdrop();

  function __interact(address deployer) internal override {
    address spaceOwner = deploySpaceOwner.deploy(deployer);
    address spaceFactory = deploySpaceFactory.deploy(deployer);
    address baseRegistry = deployBaseRegistry.deploy(deployer);
    address townsBase = deployTownsBase.deploy(deployer);
    address mainnetProxyDelegation = deployProxyDelegation.deploy(deployer);
    address riverAirdrop = deployRiverAirdrop.deploy(deployer);

    // this is for anvil deployment only
    vm.startBroadcast(deployer);
    // this is for anvil deployment only
    MockTowns(townsBase).localMint(riverAirdrop, MAX_CLAIMABLE_SUPPLY);
    ISpaceOwner(spaceOwner).setFactory(spaceFactory);
    IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
    IImplementationRegistry(spaceFactory).addImplementation(riverAirdrop);
    SpaceDelegationFacet(baseRegistry).setRiverToken(townsBase);
    IMainnetDelegation(baseRegistry).setProxyDelegation(mainnetProxyDelegation);
    vm.stopBroadcast();
  }
}
