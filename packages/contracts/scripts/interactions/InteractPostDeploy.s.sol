// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

import {IImplementationRegistry} from "./../../src/factory/facets/registry/IImplementationRegistry.sol";

import {SpaceDelegationFacet} from "src/base/registry/facets/delegation/SpaceDelegationFacet.sol";
import {IMainnetDelegation} from "src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";

// libraries

// contracts

import {MAX_CLAIMABLE_SUPPLY} from "./InteractClaimCondition.s.sol";
import {Interaction} from "scripts/common/Interaction.s.sol";
import {MockTowns} from "test/mocks/MockTowns.sol";

// deployments
import {DeployProxyBatchDelegation} from "scripts/deployments/utils/DeployProxyBatchDelegation.s.sol";
import {DeployTownsBase} from "scripts/deployments/utils/DeployTownsBase.s.sol";

contract InteractPostDeploy is Interaction {
    DeployProxyBatchDelegation deployProxyDelegation = new DeployProxyBatchDelegation();
    DeployTownsBase deployTownsBase = new DeployTownsBase();

    function __interact(address deployer) internal override {
        vm.pauseGasMetering();
        address spaceOwner = getDeployment("spaceOwner");
        address spaceFactory = getDeployment("spaceFactory");
        address baseRegistry = getDeployment("baseRegistry");
        address riverAirdrop = getDeployment("riverAirdrop");
        address appRegistry = getDeployment("appRegistry");
        address townsBase = deployTownsBase.deploy(deployer);
        address proxyDelegation = deployProxyDelegation.deploy(deployer);

        // this is for anvil deployment only
        vm.startBroadcast(deployer);
        // this is for anvil deployment only
        MockTowns(townsBase).localMint(riverAirdrop, MAX_CLAIMABLE_SUPPLY);
        ISpaceOwner(spaceOwner).setFactory(spaceFactory);
        IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
        IImplementationRegistry(spaceFactory).addImplementation(riverAirdrop);
        IImplementationRegistry(spaceFactory).addImplementation(appRegistry);
        SpaceDelegationFacet(baseRegistry).setRiverToken(townsBase);
        IMainnetDelegation(baseRegistry).setProxyDelegation(proxyDelegation);
        vm.stopBroadcast();
    }
}
