// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacet, IDropFacetBase} from "src/airdrop/drop/IDropFacet.sol";

// libraries
import {DropGroup} from "src/airdrop/drop/DropGroup.sol";
import {MerkleTree} from "test/utils/MerkleTree.sol";

// contracts
import {Interaction} from "scripts/common/Interaction.s.sol";

// deployments
import {DeployRiverAirdrop} from "scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";
import {DeployTownsBase} from "scripts/deployments/utils/DeployTownsBase.s.sol";

uint256 constant MAX_CLAIMABLE_SUPPLY = 5 ether;

contract InteractClaimCondition is IDropFacetBase, Interaction {
    address[] public wallets;
    uint256[] public amounts;
    uint256[] public points;

    function setUp() public {
        wallets.push(0x86312a65B491CF25D9D265f6218AB013DaCa5e19);
        amounts.push(1 ether); // equivalent to 1 token
        points.push(1);
    }

    function __interact(address deployer) internal override {
        vm.pauseGasMetering();

        DeployRiverAirdrop deployRiverAirdrop = new DeployRiverAirdrop();
        DeployTownsBase deployTownsBase = new DeployTownsBase();
        MerkleTree merkleTree = new MerkleTree();

        address riverAirdrop = deployRiverAirdrop.deploy(deployer);
        address townsBase = deployTownsBase.deploy(deployer);
        (bytes32 root, ) = merkleTree.constructTree(wallets, amounts, points);

        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = DropGroup.ClaimCondition({
            startTimestamp: uint40(block.timestamp),
            endTimestamp: 0,
            maxClaimableSupply: MAX_CLAIMABLE_SUPPLY,
            supplyClaimed: 0,
            merkleRoot: root,
            currency: address(townsBase),
            penaltyBps: 1000 // 10%
        });

        vm.broadcast(deployer);
        IDropFacet(riverAirdrop).setClaimConditions(conditions);
    }
}
