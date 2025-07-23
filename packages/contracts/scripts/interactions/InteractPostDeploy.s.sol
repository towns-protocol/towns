// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IImplementationRegistry} from "../../src/factory/facets/registry/IImplementationRegistry.sol";
import {ISpaceDelegation} from "src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IMainnetDelegation} from "src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {INodeOperator} from "src/base/registry/facets/operator/INodeOperator.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {NodeOperatorStatus} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";

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

    address internal constant OPERATOR = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address internal constant STAKER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

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
        MockTowns(townsBase).localMint(riverAirdrop, MAX_CLAIMABLE_SUPPLY);
        MockTowns(townsBase).localMint(STAKER, MAX_CLAIMABLE_SUPPLY);
        MockTowns(townsBase).localMint(baseRegistry, MAX_CLAIMABLE_SUPPLY);
        ISpaceOwner(spaceOwner).setFactory(spaceFactory);
        IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
        IImplementationRegistry(spaceFactory).addImplementation(riverAirdrop);
        IImplementationRegistry(spaceFactory).addImplementation(appRegistry);
        IMainnetDelegation(baseRegistry).setProxyDelegation(proxyDelegation);
        IRewardsDistribution(baseRegistry).setRewardNotifier(deployer, true);
        IRewardsDistribution(baseRegistry).notifyRewardAmount(MAX_CLAIMABLE_SUPPLY);

        INodeOperator operatorFacet = INodeOperator(baseRegistry);
        operatorFacet.registerOperator(OPERATOR);
        operatorFacet.setOperatorStatus(OPERATOR, NodeOperatorStatus.Approved);
        vm.stopBroadcast();
    }
}
