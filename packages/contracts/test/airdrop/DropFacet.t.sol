// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {Vm} from "forge-std/Test.sol";

//interfaces
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {IDropFacetBase} from "src/airdrop/drop/IDropFacet.sol";
import {IRewardsDistributionBase} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

//libraries
import {DropClaim} from "src/airdrop/drop/DropClaim.sol";
import {DropGroup} from "src/airdrop/drop/DropGroup.sol";
import {DropStorage} from "src/airdrop/drop/DropStorage.sol";
import {NodeOperatorStatus} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {StakingRewards} from "src/base/registry/facets/distribution/v2/StakingRewards.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";
import {MerkleTree} from "test/utils/MerkleTree.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {NodeOperatorFacet} from "src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {TownsPoints} from "src/airdrop/points/TownsPoints.sol";
import {DropFacet} from "src/airdrop/drop/DropFacet.sol";

contract DropFacetTest is BaseSetup, IDropFacetBase, IOwnableBase, IRewardsDistributionBase {
    using FixedPointMathLib for uint256;

    bytes32 internal constant STAKE_TYPEHASH =
        keccak256(
            "Stake(uint96 amount,address delegatee,address beneficiary,address owner,uint256 nonce,uint256 deadline)"
        );

    struct ClaimData {
        address claimer;
        uint16 amount;
        uint16 points;
    }

    uint256 internal constant TOTAL_TOKEN_AMOUNT = 1000;
    uint16 internal constant PENALTY_BPS = 5000;

    MerkleTree internal merkleTree = new MerkleTree();

    Towns internal towns;
    DropFacet internal dropFacet;
    IRewardsDistribution internal rewardsDistribution;
    TownsPoints internal pointsFacet;
    NodeOperatorFacet internal operatorFacet;

    mapping(address => uint256) internal treeIndex;
    address[] internal accounts;
    uint256[] internal amounts;
    uint256[] internal points;

    bytes32[][] internal tree;
    bytes32 internal root;

    address internal bob;
    uint256 internal bobKey;
    address internal alice;
    uint256 internal aliceKey;

    address internal NOTIFIER = makeAddr("NOTIFIER");
    uint256 internal rewardDuration;
    uint256 internal timeLapse;

    function setUp() public override {
        super.setUp();

        (bob, bobKey) = makeAddrAndKey("bob");
        (alice, aliceKey) = makeAddrAndKey("alice");

        // Initialize the Drop facet
        dropFacet = DropFacet(riverAirdrop);
        pointsFacet = TownsPoints(riverAirdrop);

        // Create the Merkle tree with accounts and amounts
        _createTree();

        // Initialize the Towns towns
        towns = Towns(townsToken);

        // Operator
        operatorFacet = NodeOperatorFacet(baseRegistry);

        // EIP712
        eip712Facet = EIP712Facet(baseRegistry);

        // RewardsDistribution
        rewardsDistribution = IRewardsDistribution(baseRegistry);

        vm.prank(deployer);
        rewardsDistribution.setRewardNotifier(NOTIFIER, true);

        vm.prank(bridge);
        towns.mint(address(rewardsDistribution), 1 ether);

        vm.prank(NOTIFIER);
        rewardsDistribution.notifyRewardAmount(1 ether);

        rewardDuration = rewardsDistribution.stakingState().rewardDuration;
        timeLapse = 1 days;
    }

    // =============================================================
    //                        MODIFIERS
    // =============================================================

    modifier givenTokensMinted(uint256 amount) {
        vm.prank(bridge);
        towns.mint(address(dropFacet), amount);
        _;
    }

    modifier givenClaimConditionSet(uint16 penaltyBps) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[0].penaltyBps = penaltyBps;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);
        _;
    }

    modifier givenWalletHasClaimedWithPenalty(address wallet, address caller) {
        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        DropGroup.ClaimCondition memory condition = dropFacet.getClaimConditionById(conditionId);
        uint16 penaltyBps = condition.penaltyBps;
        uint256 merkleAmount = amounts[treeIndex[wallet]];
        uint256 merklePoints = points[treeIndex[wallet]];
        uint256 penaltyAmount = BasisPoints.calculate(merkleAmount, penaltyBps);
        uint256 expectedAmount = merkleAmount - penaltyAmount;
        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[wallet]);

        vm.prank(caller);
        vm.expectEmit(address(dropFacet));
        emit DropFacet_Claimed_WithPenalty(conditionId, caller, wallet, expectedAmount);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: wallet,
                quantity: merkleAmount,
                points: merklePoints,
                proof: proof
            }),
            penaltyBps
        );
        _;
    }

    modifier givenOperatorRegistered(address operator, uint256 commissionRate) {
        vm.assume(operator != address(0));
        commissionRate = bound(commissionRate, 0, 1000);

        vm.startPrank(operator);
        operatorFacet.registerOperator(operator);
        operatorFacet.setCommissionRate(commissionRate);
        vm.stopPrank();

        vm.startPrank(deployer);
        operatorFacet.setOperatorStatus(operator, NodeOperatorStatus.Approved);
        operatorFacet.setOperatorStatus(operator, NodeOperatorStatus.Active);
        vm.stopPrank();
        _;
    }

    /// @notice Given a wallet has claimed and staked
    /// @param caller The caller of the claimAndStake function
    /// @param operator The town or node the wallet is staking to
    /// @param wallet The wallet that is allocated the tokens
    /// @param walletKey The key of the wallet that is allocated the tokens
    /// @param amount The amount of tokens to claim and stake
    /// @param point The points to claim and stake
    modifier givenWalletHasClaimedAndStaked(
        address caller,
        address operator,
        address wallet,
        uint256 walletKey,
        uint256 amount,
        uint256 point
    ) {
        vm.assume(caller != address(0));
        vm.assume(amount > 0);
        vm.assume(point > 0);
        vm.assume(operator != address(0));
        vm.assume(caller != operator);
        vm.assume(caller != wallet);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[wallet]);

        uint48 lockDuration = 30 days;

        vm.prank(caller);
        // Calculate expected amount after penalty reduction
        uint256 expectedAmount = _calculateExpectedAmountAfterPenalty(amount, 5000, lockDuration);
        vm.expectEmit(address(dropFacet));
        emit DropFacet_Claimed_And_Staked(conditionId, caller, wallet, expectedAmount);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: wallet,
                quantity: amount,
                points: point,
                proof: proof
            }),
            operator,
            lockDuration
        );
        _;
    }

    // =============================================================
    //                        TESTS
    // =============================================================

    // getActiveClaimConditionId
    function test_getActiveClaimConditionId() external givenTokensMinted(TOTAL_TOKEN_AMOUNT * 3) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](3);
        conditions[0] = _createClaimCondition(block.timestamp - 100, root, TOTAL_TOKEN_AMOUNT); // expired
        conditions[1] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT); // active
        conditions[2] = _createClaimCondition(block.timestamp + 100, root, TOTAL_TOKEN_AMOUNT); // future

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 id = dropFacet.getActiveClaimConditionId();
        assertEq(id, 1);

        vm.warp(block.timestamp + 100);
        id = dropFacet.getActiveClaimConditionId();
        assertEq(id, 2);
    }

    function test_getActiveClaimConditionId_revertWhen_noActiveClaimCondition() external {
        vm.expectRevert(DropFacet__NoActiveClaimCondition.selector);
        dropFacet.getActiveClaimConditionId();
    }

    // getClaimConditionById
    function test_getClaimConditionById(
        uint16 penaltyBps
    ) external givenTokensMinted(TOTAL_TOKEN_AMOUNT) givenClaimConditionSet(penaltyBps) {
        DropGroup.ClaimCondition memory condition = dropFacet.getClaimConditionById(
            dropFacet.getActiveClaimConditionId()
        );
        assertEq(condition.startTimestamp, block.timestamp);
        assertEq(condition.maxClaimableSupply, TOTAL_TOKEN_AMOUNT);
        assertEq(condition.supplyClaimed, 0);
        assertEq(condition.merkleRoot, root);
        assertEq(condition.currency, address(towns));
        assertEq(condition.penaltyBps, penaltyBps);
    }

    // claimWithPenalty
    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_claimWithPenalty(ClaimData[] memory claimData) external {
        vm.assume(claimData.length > 0 && claimData.length <= 1000);

        uint256 totalAmount;
        address[] memory claimers = new address[](claimData.length);
        uint256[] memory claimAmounts = new uint256[](claimData.length);
        uint256[] memory claimPoints = new uint256[](claimData.length);

        for (uint256 i; i < claimData.length; ++i) {
            assumeNotPrecompile(claimData[i].claimer);
            claimData[i].claimer = claimData[i].claimer == address(0)
                ? _randomAddress()
                : claimData[i].claimer;
            claimers[i] = claimData[i].claimer;
            claimAmounts[i] = claimData[i].amount == 0 ? 1 : claimData[i].amount;
            claimPoints[i] = claimData[i].points == 0 ? 1 : claimData[i].points;
            claimData[i].amount = uint16(claimAmounts[i]);
            claimData[i].points = uint16(claimPoints[i]);

            vm.prank(space);
            pointsFacet.mint(claimData[i].claimer, claimPoints[i]);

            totalAmount += claimAmounts[i];
        }

        vm.prank(bridge);
        towns.mint(address(dropFacet), totalAmount);

        (root, tree) = merkleTree.constructTree(claimers, claimAmounts, claimPoints);

        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = DropGroup.ClaimCondition({
            startTimestamp: uint40(block.timestamp),
            endTimestamp: 0,
            maxClaimableSupply: totalAmount,
            supplyClaimed: 0,
            merkleRoot: root,
            currency: address(towns),
            penaltyBps: PENALTY_BPS
        });

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();
        DropGroup.ClaimCondition memory condition = dropFacet.getClaimConditionById(conditionId);

        for (uint256 i; i < claimData.length; ++i) {
            address claimer = claimData[i].claimer;
            uint16 amount = claimData[i].amount;
            uint16 point = claimData[i].points;
            uint16 penaltyBps = condition.penaltyBps;
            uint256 penaltyAmount = BasisPoints.calculate(amount, penaltyBps);
            uint256 expectedAmount = amount - penaltyAmount;

            if (dropFacet.getSupplyClaimedByWallet(claimer, conditionId) > 0) {
                continue;
            }

            bytes32[] memory proof = merkleTree.getProof(tree, i);
            uint256 currentPoints = pointsFacet.balanceOf(claimer);

            vm.prank(claimer);
            vm.expectEmit(address(dropFacet));
            emit DropFacet_Claimed_WithPenalty(conditionId, claimer, claimer, expectedAmount);
            dropFacet.claimWithPenalty(
                DropClaim.Claim({
                    conditionId: conditionId,
                    account: claimer,
                    quantity: amount,
                    points: point,
                    proof: proof
                }),
                penaltyBps
            );

            assertEq(dropFacet.getSupplyClaimedByWallet(claimer, conditionId), expectedAmount);
            assertEq(pointsFacet.balanceOf(claimer), currentPoints - point);
        }
    }

    function test_claimWithPenalty()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
        givenClaimConditionSet(5000)
        givenWalletHasClaimedWithPenalty(bob, bob)
    {
        vm.prank(space);
        pointsFacet.mint(bob, 10);

        uint256 expectedAmount = _calculateExpectedAmount(bob);
        assertEq(towns.balanceOf(bob), expectedAmount);
        assertEq(pointsFacet.balanceOf(bob), 10);
    }

    function test_revertWhen_merkleRootNotSet() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, bytes32(0), TOTAL_TOKEN_AMOUNT);
        conditions[0].penaltyBps = PENALTY_BPS;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__MerkleRootNotSet.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: 100,
                points: 1,
                proof: new bytes32[](0)
            }),
            PENALTY_BPS
        );
    }

    function test_revertWhen_quantityIsZero() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[0].penaltyBps = PENALTY_BPS;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__QuantityMustBeGreaterThanZero.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: 0,
                points: 1,
                proof: new bytes32[](0)
            }),
            PENALTY_BPS
        );
    }

    function test_revertWhen_exceedsMaxClaimableSupply()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        // 50 tokens in total for this condition
        conditions[0] = _createClaimCondition(block.timestamp, root, 50);
        conditions[0].penaltyBps = PENALTY_BPS;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__ExceedsMaxClaimableSupply.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: 101,
                points: 1,
                proof: new bytes32[](0)
            }),
            PENALTY_BPS
        );
    }

    function test_revertWhen_claimHasNotStarted() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[0].penaltyBps = PENALTY_BPS;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        vm.warp(block.timestamp - 100);

        vm.prank(bob);
        vm.expectRevert(DropFacet__ClaimHasNotStarted.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            PENALTY_BPS
        );
    }

    function test_revertWhen_claimHasEnded() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[0].endTimestamp = uint40(block.timestamp + 100);
        conditions[0].penaltyBps = PENALTY_BPS;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        vm.warp(conditions[0].endTimestamp);

        vm.expectRevert(DropFacet__ClaimHasEnded.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            PENALTY_BPS
        );
    }

    function test_revertWhen_alreadyClaimed() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            0
        );

        vm.expectRevert(DropFacet__AlreadyClaimed.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            0
        );
    }

    function test_revertWhen_invalidProof()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
        givenClaimConditionSet(5000)
    {
        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__InvalidProof.selector);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: new bytes32[](0)
            }),
            PENALTY_BPS
        );
    }

    // claimAndStake
    function test_fuzz_claimAndStake(
        address caller,
        address operator,
        uint256 commissionRate
    )
        external
        givenOperatorRegistered(operator, commissionRate)
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
        givenClaimConditionSet(5000)
        givenWalletHasClaimedAndStaked(
            caller,
            operator,
            bob,
            bobKey,
            amounts[treeIndex[bob]],
            points[treeIndex[bob]]
        )
    {
        uint256 conditionId = dropFacet.getActiveClaimConditionId();
        uint256 depositId = dropFacet.getDepositIdByWallet(bob, conditionId);
        uint256 depositAmount = _calculateExpectedAmountAfterPenalty(
            amounts[treeIndex[bob]],
            5000,
            30 days
        );

        // Verify that the correct amount was staked (reduced due to penalty)
        assertEq(rewardsDistribution.stakedByDepositor(address(dropFacet)), depositAmount);

        // move time forward
        vm.warp(block.timestamp + timeLapse);

        uint256 currentReward = rewardsDistribution.currentReward(bob);

        vm.prank(bob);
        uint256 claimReward = rewardsDistribution.claimReward(bob, bob);
        _verifyClaim(bob, bob, claimReward, currentReward);

        // Wait for lock period to expire and unlock the stake
        vm.warp(block.timestamp + 30 days);

        vm.prank(bob);
        dropFacet.unlockStake(conditionId);

        vm.prank(bob);
        rewardsDistribution.initiateWithdraw(depositId);
        uint256 lockExpiration = towns.lockExpiration(
            rewardsDistribution.delegationProxyById(depositId)
        );
        vm.warp(lockExpiration);

        vm.prank(bob);
        rewardsDistribution.withdraw(depositId);

        assertEq(towns.balanceOf(bob), depositAmount + claimReward);
        assertEq(pointsFacet.balanceOf(bob), 0);
    }

    // add revert tests for claimAndStake
    function test_revertWhen_claimAndStake_merkleRootNotSet()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, bytes32(0), TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__MerkleRootNotSet.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: 100,
                points: 1,
                proof: new bytes32[](0)
            }),
            address(1),
            30 days
        );
    }

    function test_revertWhen_claimAndStake_quantityIsZero()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__QuantityMustBeGreaterThanZero.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: 0,
                points: 1,
                proof: new bytes32[](0)
            }),
            address(1),
            30 days
        );
    }

    function test_revertWhen_claimAndStake_exceedsMaxClaimableSupply()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        // 100 tokens in total for this condition
        conditions[0] = _createClaimCondition(block.timestamp, root, 100);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__ExceedsMaxClaimableSupply.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: 101,
                points: 1,
                proof: new bytes32[](0)
            }),
            address(1),
            30 days
        );
    }

    function test_revertWhen_claimAndStake_claimHasNotStarted()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        vm.warp(block.timestamp - 100);

        vm.prank(bob);
        vm.expectRevert(DropFacet__ClaimHasNotStarted.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            address(1),
            30 days
        );
    }

    function test_revertWhen_claimAndStake_claimHasEnded()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[0].endTimestamp = uint40(block.timestamp + 100);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        vm.warp(conditions[0].endTimestamp);

        vm.expectRevert(DropFacet__ClaimHasEnded.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            address(1),
            30 days
        );
    }

    function test_revertWhen_claimAndStake_alreadyClaimed(
        address operator,
        uint256 commissionRate
    )
        external
        givenOperatorRegistered(operator, commissionRate)
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            operator,
            30 days
        );

        vm.expectRevert(DropFacet__AlreadyClaimed.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            address(1),
            30 days
        );
    }

    function test_revertWhen_claimAndStake_invalidProof()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
        givenClaimConditionSet(5000)
    {
        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        vm.expectRevert(DropFacet__InvalidProof.selector);
        dropFacet.claimAndStake(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: new bytes32[](0)
            }),
            address(1),
            30 days
        );
    }

    // setClaimConditions
    function test_setClaimConditions() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();
        assertEq(conditionId, 0);
    }

    function test_setClaimConditions_resetEligibility()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT * 2)
        givenClaimConditionSet(5000)
        givenWalletHasClaimedWithPenalty(bob, bob)
    {
        uint256 conditionId = dropFacet.getActiveClaimConditionId();
        uint256 expectedAmount = _calculateExpectedAmount(bob);

        assertEq(dropFacet.getSupplyClaimedByWallet(bob, conditionId), expectedAmount);

        vm.warp(block.timestamp + 100);

        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 newConditionId = dropFacet.getActiveClaimConditionId();
        assertEq(newConditionId, 0);
    }

    function test_fuzz_setClaimConditions_revertWhen_notOwner(address caller) external {
        vm.assume(caller != deployer);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
        dropFacet.setClaimConditions(new DropGroup.ClaimCondition[](0));
    }

    function test_revertWhen_setClaimConditions_notInAscendingOrder()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](2);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[1] = _createClaimCondition(block.timestamp - 100, root, TOTAL_TOKEN_AMOUNT);

        vm.expectRevert(DropFacet__ClaimConditionsNotInAscendingOrder.selector);
        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);
    }

    function test_revertWhen_setClaimConditions_exceedsMaxClaimableSupply()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        // Create a single claim condition
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, 100);

        // Set the claim conditions as the deployer
        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        // Get the active condition ID
        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        // Generate Merkle proof for Bob
        bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob]);

        // Simulate Bob claiming tokens
        vm.prank(bob);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[treeIndex[bob]],
                points: points[treeIndex[bob]],
                proof: proof
            }),
            0
        );

        // Move time forward
        vm.warp(block.timestamp + 100);

        // Attempt to set a new max claimable supply lower than what's already been claimed
        conditions[0].maxClaimableSupply = 99; // Try to set max supply to 99 tokens

        // Expect the transaction to revert when trying to set new claim conditions
        vm.expectRevert(DropFacet__CannotSetClaimConditions.selector);
        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);
    }

    // getClaimConditions
    function test_getClaimConditions(
        uint16 penaltyBps
    ) external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition[] memory currentConditions = dropFacet.getClaimConditions();
        assertEq(currentConditions.length, 0);

        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](1);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        conditions[0].penaltyBps = penaltyBps;

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        currentConditions = dropFacet.getClaimConditions();
        assertEq(currentConditions.length, 1);
        assertEq(currentConditions[0].startTimestamp, conditions[0].startTimestamp);
        assertEq(currentConditions[0].endTimestamp, conditions[0].endTimestamp);
        assertEq(currentConditions[0].maxClaimableSupply, conditions[0].maxClaimableSupply);
        assertEq(currentConditions[0].supplyClaimed, conditions[0].supplyClaimed);
        assertEq(currentConditions[0].merkleRoot, conditions[0].merkleRoot);
        assertEq(currentConditions[0].penaltyBps, penaltyBps);
    }

    // addClaimCondition
    function test_addClaimCondition() external givenTokensMinted(TOTAL_TOKEN_AMOUNT) {
        DropGroup.ClaimCondition memory condition = _createClaimCondition(
            block.timestamp,
            root,
            TOTAL_TOKEN_AMOUNT
        );

        vm.prank(deployer);
        dropFacet.addClaimCondition(condition);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();
        assertEq(conditionId, 0);
    }

    function test_revertWhen_addClaimCondition_notInAscendingOrder()
        external
        givenTokensMinted(TOTAL_TOKEN_AMOUNT)
    {
        DropGroup.ClaimCondition memory condition = _createClaimCondition(
            block.timestamp,
            root,
            TOTAL_TOKEN_AMOUNT
        );

        vm.prank(deployer);
        vm.expectEmit(address(dropFacet));
        emit DropFacet_ClaimConditionAdded(0, condition);
        dropFacet.addClaimCondition(condition);

        vm.prank(deployer);
        vm.expectRevert(DropFacet__ClaimConditionsNotInAscendingOrder.selector);
        dropFacet.addClaimCondition(condition);
    }

    // =============================================================
    // End-to-end tests
    // =============================================================

    function givenOffChainRoot() internal returns (bytes32) {
        string[] memory cmds = new string[](2);
        cmds[0] = "node";
        cmds[1] = "contracts/test/airdrop/scripts/index.mjs";
        bytes memory result = vm.ffi(cmds);
        return abi.decode(result, (bytes32));
    }

    // function test_endToEnd_differentialTestingRoot() external {
    //   address[] memory _accounts = new address[](4);
    //   uint256[] memory _amounts = new uint256[](4);

    //   _accounts[0] = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    //   _amounts[0] = 1 ether;
    //   _accounts[1] = 0x2FaC60B7bCcEc9b234A2f07448D3B2a045d621B9;
    //   _amounts[1] = 1 ether;
    //   _accounts[2] = 0xa9a6512088904fbaD2aA710550B57c29ee0092c4;
    //   _amounts[2] = 1 ether;
    //   _accounts[3] = 0x86312a65B491CF25D9D265f6218AB013DaCa5e19;
    //   _amounts[3] = 1 ether;

    //   bytes32 offChainRoot = givenOffChainRoot();
    //   (bytes32 onChainRoot, ) = merkleTree.constructTree(_accounts, _amounts);

    //   assertEq(offChainRoot, onChainRoot);
    // }

    // we claim some tokens from the first condition, and then activate the second condition
    // we claim some more tokens from the second condition
    // we try to claim from the first condition by alice, this should pass
    // we reach the end of the second condition, and try to claim from it, this should fail
    function test_endToEnd_claimWithPenalty() external givenTokensMinted(TOTAL_TOKEN_AMOUNT * 2) {
        DropGroup.ClaimCondition[] memory conditions = new DropGroup.ClaimCondition[](2);
        conditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT); // endless claim condition
        conditions[1] = _createClaimCondition(block.timestamp + 100, root, TOTAL_TOKEN_AMOUNT);
        conditions[1].endTimestamp = uint40(block.timestamp + 200); // ends at block.timestamp + 200

        vm.prank(deployer);
        dropFacet.setClaimConditions(conditions);

        uint256 conditionId = dropFacet.getActiveClaimConditionId();

        // bob claims from the first condition
        uint256 bobIndex = treeIndex[bob];
        bytes32[] memory proof = merkleTree.getProof(tree, bobIndex);
        vm.prank(bob);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[bobIndex],
                points: points[bobIndex],
                proof: proof
            }),
            0
        );
        assertEq(
            dropFacet.getSupplyClaimedByWallet(bob, conditionId),
            _calculateExpectedAmount(bob)
        );

        // activate the second condition
        vm.warp(block.timestamp + 100);

        // alice claims from the second condition
        conditionId = dropFacet.getActiveClaimConditionId();
        uint256 aliceIndex = treeIndex[alice];
        proof = merkleTree.getProof(tree, aliceIndex);
        vm.prank(alice);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: alice,
                quantity: amounts[aliceIndex],
                points: points[aliceIndex],
                proof: proof
            }),
            0
        );
        assertEq(
            dropFacet.getSupplyClaimedByWallet(alice, conditionId),
            _calculateExpectedAmount(alice)
        );

        // finalize the second condition
        vm.warp(block.timestamp + 100);

        // mint more points to both alice or bob
        vm.startPrank(space);
        pointsFacet.mint(bob, points[bobIndex]);
        pointsFacet.mint(alice, points[aliceIndex]);
        vm.stopPrank();

        // bob tries to claim from the second condition, this should fail
        vm.expectRevert(DropFacet__ClaimHasEnded.selector);
        vm.prank(bob);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: bob,
                quantity: amounts[bobIndex],
                points: points[bobIndex],
                proof: proof
            }),
            0
        );

        // alice is still able to claim from the first condition
        conditionId = dropFacet.getActiveClaimConditionId();
        vm.prank(alice);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: conditionId,
                account: alice,
                quantity: amounts[aliceIndex],
                points: points[aliceIndex],
                proof: proof
            }),
            0
        );
        assertEq(
            dropFacet.getSupplyClaimedByWallet(alice, conditionId),
            _calculateExpectedAmount(alice)
        );
    }

    function test_storage_slot() external pure {
        bytes32 slot = keccak256(
            abi.encode(uint256(keccak256("diamond.facets.drop.storage")) - 1)
        ) & ~bytes32(uint256(0xff));
        assertEq(slot, DropStorage.STORAGE_SLOT, "slot");
    }

    function test_resetClaimConditions() external givenTokensMinted(TOTAL_TOKEN_AMOUNT * 3) {
        // Setup initial conditions
        DropGroup.ClaimCondition[] memory initialConditions = new DropGroup.ClaimCondition[](3);
        initialConditions[0] = _createClaimCondition(block.timestamp, root, TOTAL_TOKEN_AMOUNT);
        initialConditions[1] = _createClaimCondition(
            block.timestamp + 1 days,
            root,
            TOTAL_TOKEN_AMOUNT
        );
        initialConditions[2] = _createClaimCondition(
            block.timestamp + 2 days,
            root,
            TOTAL_TOKEN_AMOUNT
        );
        vm.prank(deployer);
        dropFacet.setClaimConditions(initialConditions);

        // Sanity check
        uint256 supplyClaimed = dropFacet.getSupplyClaimedByWallet(bob, 2);
        assertEq(supplyClaimed, 0, "Bob has not claimed yet");

        // Simulate a claim for condition id 2
        uint256 bobIndex = treeIndex[bob];
        bytes32[] memory proof = merkleTree.getProof(tree, bobIndex);
        vm.warp(block.timestamp + 2 days + 1);
        vm.prank(bob);
        dropFacet.claimWithPenalty(
            DropClaim.Claim({
                conditionId: 2,
                account: bob,
                quantity: amounts[bobIndex],
                points: points[bobIndex],
                proof: proof
            }),
            0
        );

        // Bob claim is now higher than zero
        supplyClaimed = dropFacet.getSupplyClaimedByWallet(bob, 2);
        assertGt(supplyClaimed, 0, "Bob succesfully claimed");

        // Set new conditions without resetting eligibility
        DropGroup.ClaimCondition[] memory intermediateConditions = new DropGroup.ClaimCondition[](
            2
        );
        intermediateConditions[0] = _createClaimCondition(
            block.timestamp + 3 days,
            root,
            TOTAL_TOKEN_AMOUNT
        );
        intermediateConditions[1] = _createClaimCondition(
            block.timestamp + 4 days,
            root,
            TOTAL_TOKEN_AMOUNT
        );
        vm.prank(deployer);
        dropFacet.setClaimConditions(intermediateConditions);

        // Verify that condition 2 was deleted after setting intermediateConditions
        DropGroup.ClaimCondition memory condition = dropFacet.getClaimConditionById(2);
        assertEq(condition.merkleRoot, bytes32(0), "Condition should be empty");
        assertEq(condition.supplyClaimed, 0, "Condition should be empty");
        assertEq(condition.maxClaimableSupply, 0, "Condition should be empty");
        assertEq(condition.penaltyBps, 0, "Condition should be empty");
        assertEq(condition.endTimestamp, 0, "Condition should be empty");
        assertEq(condition.startTimestamp, 0, "Condition should be empty");
        assertEq(condition.currency, address(0), "Condition should be empty");
    }

    function test_createTree() external view {
        address[] memory _accounts = new address[](2);
        uint256[] memory _amounts = new uint256[](2);
        uint256[] memory _points = new uint256[](2);

        // generated from test/airdrop/scripts/index.mjs
        bytes32 expectedRoot = 0xc9d819341fba6e6ea4621c818f59273fbaddecd7621f20ff33d3c8ae0afc966f;

        _accounts[0] = 0x328809Bc894f92807417D2dAD6b7C998c1aFdac6;
        _amounts[0] = 100;
        _points[0] = 10;
        _accounts[1] = 0x1D96F2f6BeF1202E4Ce1Ff6Dad0c2CB002861d3e;
        _amounts[1] = 200;
        _points[1] = 20;

        (bytes32 _root, ) = merkleTree.constructTree(_accounts, _amounts, _points);

        assertEq(_root, expectedRoot);
    }

    // =============================================================
    //                           Internal
    // =============================================================

    function _createClaimCondition(
        uint256 _startTime,
        bytes32 _merkleRoot,
        uint256 _maxClaimableSupply
    ) internal view returns (DropGroup.ClaimCondition memory) {
        return
            DropGroup.ClaimCondition({
                startTimestamp: uint40(_startTime),
                endTimestamp: 0,
                maxClaimableSupply: _maxClaimableSupply,
                supplyClaimed: 0,
                merkleRoot: _merkleRoot,
                currency: address(towns),
                penaltyBps: 0
            });
    }

    function _calculateExpectedAmount(address _account) internal view returns (uint256) {
        DropGroup.ClaimCondition memory condition = dropFacet.getClaimConditionById(
            dropFacet.getActiveClaimConditionId()
        );
        uint256 penaltyBps = condition.penaltyBps;
        uint256 amount = amounts[treeIndex[_account]];
        uint256 penaltyAmount = BasisPoints.calculate(amount, penaltyBps);
        uint256 expectedAmount = amount - penaltyAmount;
        return expectedAmount;
    }

    function _createTree() internal {
        vm.startPrank(space);
        pointsFacet.mint(bob, 10);
        pointsFacet.mint(alice, 20);
        vm.stopPrank();

        // Create the Merkle tree with accounts and amounts
        accounts.push(bob);
        amounts.push(100);
        points.push(10);
        accounts.push(alice);
        amounts.push(200);
        points.push(20);

        treeIndex[bob] = 0;
        treeIndex[alice] = 1;
        (root, tree) = merkleTree.constructTree(accounts, amounts, points);
    }

    function _signStake(
        address operator,
        address beneficiary,
        uint256 beneficiaryKey,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                STAKE_TYPEHASH,
                amounts[treeIndex[beneficiary]],
                operator,
                beneficiary,
                beneficiary,
                eip712Facet.nonces(beneficiary),
                deadline
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = signIntent(
            beneficiaryKey,
            address(eip712Facet),
            structHash
        );
        return abi.encodePacked(r, s, v);
    }

    function _verifyClaim(
        address beneficiary,
        address claimer,
        uint256 reward,
        uint256 currentReward
    ) internal view {
        assertEq(reward, currentReward, "reward");
        assertEq(towns.balanceOf(claimer), reward, "reward balance");

        StakingState memory state = rewardsDistribution.stakingState();
        uint256 earningPower = rewardsDistribution.treasureByBeneficiary(beneficiary).earningPower;

        assertEq(
            state.rewardRate.fullMulDiv(timeLapse, state.totalStaked).fullMulDiv(
                earningPower,
                StakingRewards.SCALE_FACTOR
            ),
            reward,
            "expected reward"
        );
    }

    function _calculateExpectedAmountAfterPenalty(
        uint256 amount,
        uint16 penaltyBps,
        uint48 lockDuration
    ) internal pure returns (uint256) {
        uint48 maxLockDuration = 180 days;
        // linear decrease of penaltyBps according to lockDuration
        penaltyBps = uint16(
            (uint256(penaltyBps) * (maxLockDuration - lockDuration)) / maxLockDuration
        );
        
        uint256 remaining = amount;
        if (penaltyBps != 0) {
            uint256 penaltyAmount = (amount * penaltyBps) / 10000;
            remaining = amount - penaltyAmount;
        }
        return remaining;
    }
}
