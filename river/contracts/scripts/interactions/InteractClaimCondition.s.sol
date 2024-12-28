// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDropFacetBase, IDropFacet} from "contracts/src/tokens/drop/IDropFacet.sol";

// libraries
import {MerkleTree} from "contracts/test/utils/MerkleTree.sol";

// contracts
import {Interaction} from "contracts/scripts/common/Interaction.s.sol";

// deployments
import {DeployRiverAirdrop} from "contracts/scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";
import {DeployRiverBase} from "contracts/scripts/deployments/utils/DeployRiverBase.s.sol";

uint256 constant MAX_CLAIMABLE_SUPPLY = 5 ether;

contract InteractClaimCondition is IDropFacetBase, Interaction {
  // deployments
  DeployRiverAirdrop deployRiverAirdrop = new DeployRiverAirdrop();
  DeployRiverBase deployRiverBase = new DeployRiverBase();
  MerkleTree merkleTree = new MerkleTree();

  address[] public wallets;
  uint256[] public amounts;

  function setUp() public {
    wallets.push(0x86312a65B491CF25D9D265f6218AB013DaCa5e19);
    amounts.push(1 ether); // equivalent to 1 token
  }

  function __interact(address deployer) internal override {
    address riverAirdrop = deployRiverAirdrop.deploy(deployer);
    address riverBase = deployRiverBase.deploy(deployer);
    (bytes32 root, ) = merkleTree.constructTree(wallets, amounts);

    ClaimCondition[] memory conditions = new ClaimCondition[](1);
    conditions[0] = ClaimCondition({
      startTimestamp: uint40(block.timestamp),
      endTimestamp: 0,
      maxClaimableSupply: MAX_CLAIMABLE_SUPPLY,
      supplyClaimed: 0,
      merkleRoot: root,
      currency: address(riverBase),
      penaltyBps: 1000 // 10%
    });

    vm.startBroadcast(deployer);
    IDropFacet(riverAirdrop).setClaimConditions(conditions);
    vm.stopBroadcast();
  }
}
