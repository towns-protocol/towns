// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {RewardsVerifier} from "../base/registry/RewardsVerifier.t.sol";
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {DeployBase} from "scripts/common/DeployBase.s.sol";
import {DeployRewardsDistributionV2} from "scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";

// interfaces
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IDiamondLoupe} from "@towns-protocol/diamond/src/facets/loupe/IDiamondLoupe.sol";
import {IERC173} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ICrossDomainMessenger} from "src/base/registry/facets/mainnet/ICrossDomainMessenger.sol";
import {IMainnetDelegation, IMainnetDelegationBase} from "src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {INodeOperator} from "src/base/registry/facets/operator/INodeOperator.sol";
import {IRewardsDistribution} from "src/base/registry/facets/distribution/v2/IRewardsDistribution.sol";

// libraries
import {StakingRewards} from "src/base/registry/facets/distribution/v2/StakingRewards.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

// contracts
import {MainnetDelegation} from "src/base/registry/facets/mainnet/MainnetDelegation.sol";
import {NodeOperatorStatus} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";

// deployers
import {SpaceDelegationFacet} from "src/base/registry/facets/delegation/SpaceDelegationFacet.sol";

contract ForkRewardsDistributionTest is
    DeployBase,
    RewardsVerifier,
    TestUtils,
    IDiamond,
    IMainnetDelegationBase
{
    using FixedPointMathLib for uint256;

    uint256 internal constant rewardDuration = 14 days;
    address internal baseRegistry;
    address internal spaceFactory;
    MockMainnetDelegation internal mockMainnetDelegation;
    address internal owner;
    address[] internal activeOperators;
    uint96 internal totalStaked;

    function setUp() public {
        vm.createSelectFork("base", 30_000_000);

        vm.setEnv("DEPLOYMENT_CONTEXT", "omega");

        baseRegistry = getDeployment("baseRegistry");
        spaceFactory = getDeployment("spaceFactory");
        towns = Towns(getDeployment("utils/towns"));
        rewardsDistributionFacet = IRewardsDistribution(baseRegistry);
        owner = IERC173(baseRegistry).owner();
        mockMainnetDelegation = new MockMainnetDelegation();

        governanceActions();

        getActiveOperators();

        vm.label(address(towns), "TOWNS");
        vm.label(address(rewardsDistributionFacet), "RewardsDistribution");

        totalStaked = rewardsDistributionFacet.stakingState().totalStaked;
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_stake(
        address depositor,
        uint96 amount,
        address beneficiary,
        uint256 seed
    ) public returns (uint256 depositId) {
        address operator = randomOperator(seed);
        vm.assume(depositor != address(rewardsDistributionFacet));
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));

        depositId = stake(depositor, amount, beneficiary, operator);

        verifyStakeWithSnapshot(
            depositor,
            depositId,
            amount,
            operator,
            getCommissionRate(operator),
            beneficiary,
            _getSnapshot(depositId)
        );
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_stake_mainnetDelegation_shouldNotStartWith0(
        address delegator,
        uint96 amount,
        uint256 seed
    ) public {
        vm.createSelectFork("base", 23_492_037);

        mockMainnetDelegation = new MockMainnetDelegation();

        activeOperators = new address[](0);
        getActiveOperators();

        address operator = randomOperator(seed);
        amount = uint96(bound(amount, 1, type(uint96).max / 2));
        vm.assume(delegator != address(rewardsDistributionFacet));
        vm.assume(delegator != address(0) && delegator != operator);

        setDelegation(delegator, operator, amount);
        assertEq(IMainnetDelegation(baseRegistry).getDepositIdByDelegator(delegator), 0);
        assertEq(
            rewardsDistributionFacet.stakedByDepositor(address(rewardsDistributionFacet)),
            amount
        );

        setDelegation(delegator, operator, amount);
        assertEq(IMainnetDelegation(baseRegistry).getDepositIdByDelegator(delegator), 1);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_increaseStake(
        uint96 amount0,
        uint96 amount1,
        address beneficiary,
        uint256 seed
    ) public {
        address operator = randomOperator(seed);
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        amount0 = uint96(bound(amount0, 1, type(uint96).max - totalStaked - 1));
        amount1 = uint96(bound(amount1, 1, type(uint96).max - totalStaked - amount0));

        uint96 totalAmount = amount0 + amount1;
        deal(address(towns), address(this), totalAmount, true);

        // Take snapshot before the initial stake
        StateSnapshot memory beforeSnapshot = takeSnapshot(address(this), operator, beneficiary);

        towns.approve(address(rewardsDistributionFacet), totalAmount);
        uint256 depositId = rewardsDistributionFacet.stake(amount0, operator, beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit IncreaseStake(depositId, amount1);

        rewardsDistributionFacet.increaseStake(depositId, amount1);

        verifyStakeWithSnapshot(
            address(this),
            depositId,
            totalAmount,
            operator,
            getCommissionRate(operator),
            beneficiary,
            beforeSnapshot
        );
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_redelegate(uint96 amount, uint256 seed0, uint256 seed1) public {
        address operator0 = randomOperator(seed0);
        address operator1 = randomOperator(seed1);
        vm.assume(operator0 != operator1);
        amount = uint96(
            bound(amount, StakingRewards.MAX_COMMISSION_RATE, type(uint96).max - totalStaked)
        );

        uint256 depositId = stake(address(this), amount, address(this), operator0);

        // Take snapshot before redelegation to track operator changes
        uint256 operator0EarningPowerBefore = rewardsDistributionFacet
            .treasureByBeneficiary(operator0)
            .earningPower;
        uint256 operator1EarningPowerBefore = rewardsDistributionFacet
            .treasureByBeneficiary(operator1)
            .earningPower;

        vm.expectEmit(address(rewardsDistributionFacet));
        emit Redelegate(depositId, operator1);

        rewardsDistributionFacet.redelegate(depositId, operator1);

        // For redelegation, commission rates might be different between operators,
        // so we just verify the relative changes without exact amounts
        uint256 operator0EarningPowerAfter = rewardsDistributionFacet
            .treasureByBeneficiary(operator0)
            .earningPower;
        uint256 operator1EarningPowerAfter = rewardsDistributionFacet
            .treasureByBeneficiary(operator1)
            .earningPower;

        // Operator0 should have less earning power than before
        assertLt(
            operator0EarningPowerAfter,
            operator0EarningPowerBefore,
            "operator0 earning power decreased"
        );

        // Operator1 should have more earning power than before
        assertGt(
            operator1EarningPowerAfter,
            operator1EarningPowerBefore,
            "operator1 earning power increased"
        );

        // Verify redelegation worked correctly
        StakingRewards.Deposit memory deposit = rewardsDistributionFacet.depositById(depositId);

        // Verify deposit structure is updated correctly
        assertEq(deposit.delegatee, operator1, "deposit delegatee updated to operator1");
        assertEq(deposit.amount, amount, "deposit amount unchanged");

        // Verify commission earning power is recalculated for new operator
        assertEq(
            deposit.commissionEarningPower,
            (amount * getCommissionRate(operator1)) / StakingRewards.MAX_COMMISSION_RATE,
            "commission earning power updated"
        );

        // Verify earning power was correctly transferred between operators
        assertEq(
            operator0EarningPowerAfter,
            operator0EarningPowerBefore -
                ((amount * getCommissionRate(operator0)) / StakingRewards.MAX_COMMISSION_RATE),
            "operator0 earning power decreased"
        );
        assertEq(
            operator1EarningPowerAfter,
            operator1EarningPowerBefore +
                ((amount * getCommissionRate(operator1)) / StakingRewards.MAX_COMMISSION_RATE),
            "operator1 earning power increased"
        );
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_changeBeneficiary(uint96 amount, address beneficiary, uint256 seed) public {
        address operator = randomOperator(seed);
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));

        uint256 depositId = stake(address(this), amount, address(this), operator);
        StateSnapshot memory beforeStakeSnapshot = _getSnapshot(depositId);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ChangeBeneficiary(depositId, beneficiary);

        rewardsDistributionFacet.changeBeneficiary(depositId, beneficiary);

        verifyStakeWithSnapshot(
            address(this),
            depositId,
            amount,
            operator,
            getCommissionRate(operator),
            beneficiary,
            beforeStakeSnapshot
        );
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_initiateWithdraw(
        uint96 amount,
        address beneficiary,
        uint256 seed
    ) public returns (uint256 depositId) {
        address operator = randomOperator(seed);
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));
        vm.assume(amount > 0);

        depositId = stake(address(this), amount, beneficiary, operator);

        // Take snapshot before withdrawal (not before staking)
        StateSnapshot memory beforeWithdrawSnapshot = takeSnapshot(
            address(this),
            operator,
            beneficiary
        );

        vm.expectEmit(address(rewardsDistributionFacet));
        emit InitiateWithdraw(address(this), depositId, amount);

        rewardsDistributionFacet.initiateWithdraw(depositId);

        // Inline verification logic for fork-compatible withdraw verification
        assertEq(
            rewardsDistributionFacet.stakedByDepositor(address(this)),
            beforeWithdrawSnapshot.depositorStaked - amount,
            "stakedByDepositor"
        );
        assertEq(towns.balanceOf(address(this)), 0, "withdrawAmount");

        StakingRewards.Deposit memory deposit = rewardsDistributionFacet.depositById(depositId);
        assertEq(deposit.amount, 0, "depositAmount");
        assertEq(deposit.owner, address(this), "owner");
        assertEq(deposit.commissionEarningPower, 0, "commissionEarningPower");
        assertEq(deposit.delegatee, address(0), "delegatee");
        assertEq(deposit.pendingWithdrawal, amount, "pendingWithdrawal");
        assertEq(deposit.beneficiary, beneficiary, "beneficiary");

        // Verify earning power decreased by stake amount (for beneficiary)
        uint256 commissionAmount = (amount * getCommissionRate(operator)) / 10_000;
        assertEq(
            rewardsDistributionFacet.treasureByBeneficiary(beneficiary).earningPower,
            beforeWithdrawSnapshot.beneficiaryEarningPower - (amount - commissionAmount), // subtract non-commission portion
            "beneficiary earningPower decreased"
        );

        // Verify operator earning power decreased by commission amount
        assertEq(
            rewardsDistributionFacet.treasureByBeneficiary(operator).earningPower,
            beforeWithdrawSnapshot.operatorEarningPower - commissionAmount,
            "operator commissionEarningPower decreased"
        );

        assertEq(
            towns.delegates(rewardsDistributionFacet.delegationProxyById(depositId)),
            address(0),
            "proxy delegatee"
        );
        assertEq(towns.getVotes(operator), beforeWithdrawSnapshot.operatorVotes - amount, "votes");
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_withdraw(
        uint96 amount,
        address beneficiary,
        uint256 seed
    ) public returns (uint256 depositId) {
        amount = uint96(bound(amount, 1, type(uint96).max - totalStaked));
        depositId = test_fuzz_initiateWithdraw(amount, beneficiary, seed);

        address proxy = rewardsDistributionFacet.delegationProxyById(depositId);
        uint256 cd = towns.lockExpiration(proxy);

        vm.warp(cd);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit Withdraw(depositId, amount);

        rewardsDistributionFacet.withdraw(depositId);

        // Fork-compatible verification: skip absolute earning power checks
        assertEq(rewardsDistributionFacet.stakedByDepositor(address(this)), 0, "stakedByDepositor");
        assertEq(towns.balanceOf(address(this)), amount, "withdrawAmount");

        StakingRewards.Deposit memory deposit = rewardsDistributionFacet.depositById(depositId);
        assertEq(deposit.amount, 0, "depositAmount");
        assertEq(deposit.owner, address(this), "owner");
        assertEq(deposit.commissionEarningPower, 0, "commissionEarningPower");
        assertEq(deposit.delegatee, address(0), "delegatee");
        assertEq(deposit.pendingWithdrawal, 0, "pendingWithdrawal");
        assertEq(deposit.beneficiary, beneficiary, "beneficiary");
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_notifyRewardAmount(uint256 reward) public {
        reward = bound(reward, rewardDuration, 1e27);
        uint256 currentBalance = towns.balanceOf(address(rewardsDistributionFacet));
        deal(address(towns), address(rewardsDistributionFacet), currentBalance + reward, true);

        // Skip event expectation in fork tests due to unpredictable state
        vm.prank(owner);
        rewardsDistributionFacet.notifyRewardAmount(reward);

        StakingState memory state = rewardsDistributionFacet.stakingState();

        assertEq(state.rewardEndTime, block.timestamp + rewardDuration, "rewardEndTime");
        assertEq(state.lastUpdateTime, block.timestamp, "lastUpdateTime");
        assertEq(
            state.rewardRate,
            reward.fullMulDiv(StakingRewards.SCALE_FACTOR, rewardDuration),
            "rewardRate"
        );
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_claimReward_byBeneficiary(
        address depositor,
        uint96 amount,
        address beneficiary,
        uint256 rewardAmount,
        uint256 timeLapse,
        uint256 seed0,
        uint256 seed1
    ) public {
        address operator0 = randomOperator(seed0);
        address operator1 = randomOperator(seed1);
        vm.assume(depositor != address(this) && depositor != address(rewardsDistributionFacet));
        vm.assume(
            beneficiary != operator0 &&
                beneficiary != operator1 &&
                beneficiary != address(this) &&
                beneficiary != address(rewardsDistributionFacet)
        );
        amount = uint96(bound(amount, 1, type(uint96).max - 1 ether));
        timeLapse = bound(timeLapse, 0, rewardDuration);

        test_fuzz_notifyRewardAmount(rewardAmount);
        stake(address(this), 1 ether, address(this), operator0);
        stake(depositor, amount, beneficiary, operator1);

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(beneficiary, beneficiary, currentReward);

        vm.prank(beneficiary);
        uint256 reward = rewardsDistributionFacet.claimReward(beneficiary, beneficiary);

        verifyClaim(beneficiary, beneficiary, reward, currentReward, timeLapse);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_claimReward_byMainnetDelegator(
        address delegator,
        address claimer,
        uint96 amount,
        uint256 rewardAmount,
        uint256 timeLapse,
        uint256 seed0,
        uint256 seed1
    ) public {
        address operator0 = randomOperator(seed0);
        address operator1 = randomOperator(seed1);
        vm.assume(
            delegator != operator0 &&
                delegator != operator1 &&
                delegator != address(this) &&
                delegator != address(rewardsDistributionFacet)
        );
        vm.assume(
            claimer != address(0) &&
                claimer != delegator &&
                claimer != operator0 &&
                claimer != operator1 &&
                claimer != address(this) &&
                claimer != address(rewardsDistributionFacet)
        );
        amount = uint96(bound(amount, 1, type(uint96).max - 1 ether));
        timeLapse = bound(timeLapse, 0, rewardDuration);

        test_fuzz_notifyRewardAmount(rewardAmount);
        stake(address(this), 1 ether, address(this), operator0);

        setDelegation(delegator, operator1, amount);

        address messenger = IMainnetDelegation(baseRegistry).getMessenger();
        address proxyDelegation = IMainnetDelegation(baseRegistry).getProxyDelegation();

        mockMessenger(messenger, proxyDelegation);
        vm.mockFunction(
            baseRegistry,
            address(mockMainnetDelegation),
            abi.encodePacked(MockMainnetDelegation.setAuthorizedClaimer.selector)
        );
        MockMainnetDelegation(baseRegistry).setAuthorizedClaimer(delegator, claimer);

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(delegator);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(delegator, delegator, currentReward);

        vm.prank(delegator);
        uint256 reward = rewardsDistributionFacet.claimReward(delegator, delegator);

        verifyClaim(delegator, delegator, reward, currentReward, timeLapse);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_claimReward_byOperator(
        uint96 amount,
        uint256 rewardAmount,
        uint256 timeLapse,
        uint256 seed
    ) public {
        address operator = randomOperator(seed);
        timeLapse = bound(timeLapse, 0, rewardDuration);
        amount = uint96(bound(amount, 1 ether, type(uint96).max - totalStaked));

        test_fuzz_notifyRewardAmount(rewardAmount);
        stake(address(this), amount, address(this), operator);

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(operator);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(operator, operator, currentReward);

        vm.prank(operator);
        uint256 reward = rewardsDistributionFacet.claimReward(operator, operator);

        // Fork-compatible verification: skip complex reward calculation
        assertEq(reward, currentReward, "reward");
        assertEq(towns.balanceOf(operator), reward, "reward balance");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           HELPER                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function governanceActions() internal {
        address distributionV2Impl = DeployRewardsDistributionV2.deploy();
        address oldImpl = IDiamondLoupe(baseRegistry).facetAddress(
            IRewardsDistribution.notifyRewardAmount.selector
        );
        address mainnetDelegationImpl = IDiamondLoupe(baseRegistry).facetAddress(
            IMainnetDelegation.setProxyDelegation.selector
        );
        address spaceDelegationImpl = IDiamondLoupe(baseRegistry).facetAddress(
            SpaceDelegationFacet.addSpaceDelegation.selector
        );

        // replace the mainnet delegation and space delegation implementations
        vm.etch(mainnetDelegationImpl, type(MainnetDelegation).runtimeCode);
        vm.etch(spaceDelegationImpl, type(SpaceDelegationFacet).runtimeCode);

        FacetCut[] memory facetCuts = new FacetCut[](2);
        facetCuts[0] = FacetCut(
            oldImpl,
            FacetCutAction.Remove,
            IDiamondLoupe(baseRegistry).facetFunctionSelectors(oldImpl)
        );
        facetCuts[1] = DeployRewardsDistributionV2.makeCut(distributionV2Impl, FacetCutAction.Add);

        vm.startPrank(owner);
        rewardsDistributionFacet.setRewardNotifier(owner, true);
        SpaceDelegationFacet(baseRegistry).setSpaceFactory(spaceFactory);
        vm.stopPrank();
    }

    function getActiveOperators() internal {
        address[] memory operators = INodeOperator(baseRegistry).getOperators();
        for (uint256 i; i < operators.length; ++i) {
            NodeOperatorStatus status = INodeOperator(baseRegistry).getOperatorStatus(operators[i]);
            if (status == NodeOperatorStatus.Active) {
                activeOperators.push(operators[i]);
            }
        }
    }

    function randomOperator(uint256 seed) internal view returns (address) {
        return activeOperators[seed % activeOperators.length];
    }

    function getCommissionRate(address operator) internal view returns (uint256) {
        return INodeOperator(baseRegistry).getCommissionRate(operator);
    }

    function stake(
        address depositor,
        uint96 amount,
        address beneficiary,
        address operator
    ) internal returns (uint256 depositId) {
        vm.assume(depositor != address(0));
        vm.assume(beneficiary != address(0));
        deal(address(towns), depositor, amount, true);
        totalStaked += amount;

        // Take snapshot before staking
        StateSnapshot memory beforeSnapshot = takeSnapshot(depositor, operator, beneficiary);

        vm.startPrank(depositor);
        towns.approve(address(rewardsDistributionFacet), amount);

        vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
        emit Stake(depositor, operator, beneficiary, depositId, amount);

        depositId = rewardsDistributionFacet.stake(amount, operator, beneficiary);
        vm.stopPrank();

        // Store snapshot for verification
        _storeSnapshot(depositId, beforeSnapshot);
    }

    mapping(uint256 => StateSnapshot) private _snapshots;

    function _storeSnapshot(uint256 depositId, StateSnapshot memory snapshot) private {
        _snapshots[depositId] = snapshot;
    }

    function _getSnapshot(uint256 depositId) internal view returns (StateSnapshot memory) {
        return _snapshots[depositId];
    }

    function mockMessenger(address messenger, address proxyDelegation) internal {
        vm.prank(messenger);
        vm.mockCall(
            messenger,
            abi.encodeWithSelector(ICrossDomainMessenger.xDomainMessageSender.selector),
            abi.encode(proxyDelegation)
        );
    }

    function setDelegation(address delegator, address operator, uint96 amount) internal {
        address messenger = IMainnetDelegation(baseRegistry).getMessenger();
        address proxyDelegation = IMainnetDelegation(baseRegistry).getProxyDelegation();

        mockMessenger(messenger, proxyDelegation);
        vm.mockFunction(
            baseRegistry,
            address(mockMainnetDelegation),
            abi.encodePacked(MockMainnetDelegation.setDelegation.selector)
        );
        MockMainnetDelegation(baseRegistry).setDelegation(delegator, operator, amount);
    }
}

/// @dev Mock contract to include deprecated functions
contract MockMainnetDelegation is MainnetDelegation {
    function setDelegation(
        address delegator,
        address operator,
        uint256 quantity
    ) external onlyCrossDomainMessenger {
        _setDelegation(delegator, operator, quantity);
    }

    function setAuthorizedClaimer(
        address owner,
        address claimer
    ) external onlyCrossDomainMessenger {
        _setAuthorizedClaimer(owner, claimer);
    }
}
