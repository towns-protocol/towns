// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {IDiamondCut} from "@towns-protocol/diamond/src/facets/cut/IDiamondCut.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";

// libraries
import {RewardsDistributionStorage} from "src/base/registry/facets/distribution/v2/RewardsDistributionStorage.sol";
import {StakingRewards} from "src/base/registry/facets/distribution/v2/StakingRewards.sol";
import {stdError} from "forge-std/StdError.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {PermitHash} from "@uniswap/permit2/src/libraries/PermitHash.sol";

// contracts
import {BaseRegistryTest} from "./BaseRegistry.t.sol";
import {DeployRewardsDistributionV2} from "scripts/deployments/facets/DeployRewardsDistributionV2.s.sol";
import {DelegationProxy} from "src/base/registry/facets/distribution/v2/DelegationProxy.sol";
import {RewardsDistributionV2} from "src/base/registry/facets/distribution/v2/RewardsDistributionV2.sol";
import {UpgradeableBeaconBase} from "src/diamond/facets/beacon/UpgradeableBeacon.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";
import {DeployPermit2} from "@uniswap/permit2/test/utils/DeployPermit2.sol";

contract RewardsDistributionV2Test is BaseRegistryTest, IOwnableBase, IDiamond {
    using FixedPointMathLib for uint256;

    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    bytes32 internal constant STAKE_TYPEHASH =
        keccak256(
            "Stake(uint96 amount,address delegatee,address beneficiary,address owner,uint256 nonce,uint256 deadline)"
        );

    function setUp() public virtual override {
        // etch Permit2 to the deterministic address
        new DeployPermit2().run();
        vm.label(PERMIT2, "Permit2");

        super.setUp();
    }

    function test_storageSlot() public pure {
        bytes32 slot = keccak256(
            abi.encode(uint256(keccak256("facets.registry.rewards.distribution.v2.storage")) - 1)
        ) & ~bytes32(uint256(0xff));
        assertEq(slot, RewardsDistributionStorage.STORAGE_SLOT, "slot");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setRewardNotifier_revertIf_notOwner() public {
        address caller = _randomAddress();
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
        rewardsDistributionFacet.setRewardNotifier(caller, true);
    }

    function test_fuzz_setRewardNotifier(address notifier, bool isRewardNotifier) public {
        vm.expectEmit(address(rewardsDistributionFacet));
        emit RewardNotifierSet(notifier, isRewardNotifier);

        vm.prank(deployer);
        rewardsDistributionFacet.setRewardNotifier(notifier, isRewardNotifier);
    }

    function test_setPeriodRewardAmount_revertIf_notOwner() public {
        address caller = _randomAddress();
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
        rewardsDistributionFacet.setPeriodRewardAmount(1);
    }

    function test_fuzz_setPeriodRewardAmount(uint256 reward) public {
        vm.expectEmit(address(rewardsDistributionFacet));
        emit PeriodRewardAmountSet(reward);

        vm.prank(deployer);
        rewardsDistributionFacet.setPeriodRewardAmount(reward);

        assertEq(rewardsDistributionFacet.getPeriodRewardAmount(), reward);
    }

    function test_reinitialize() public {
        uint256 depositId = test_stake();

        deployTokenBase.setSalts(_randomBytes32(), _randomBytes32());
        address newTowns = deployTokenBase.deploy(deployer);

        address implementation = address(new RewardsDistributionV2());
        FacetCut memory cut = DeployRewardsDistributionV2.makeCut(
            implementation,
            FacetCutAction.Replace
        );
        FacetCut[] memory cuts = new FacetCut[](1);
        cuts[0] = cut;
        bytes memory initData = DeployRewardsDistributionV2.makeInitData(
            newTowns,
            newTowns,
            14 days
        );

        vm.prank(deployer);
        IDiamondCut(baseRegistry).diamondCut(cuts, implementation, initData);

        address proxy = rewardsDistributionFacet.delegationProxyById(depositId);

        assertEq(DelegationProxy(proxy).factory(), baseRegistry);
        assertEq(DelegationProxy(proxy).stakeToken(), newTowns);
        assertEq(IVotes(newTowns).delegates(proxy), OPERATOR);
        assertEq(IERC20(newTowns).allowance(proxy, baseRegistry), type(uint256).max);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      DELEGATION PROXY                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_upgradeDelegationProxy_revertIf_notOwner() public {
        address caller = _randomAddress();
        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, caller));
        rewardsDistributionFacet.upgradeDelegationProxy(address(this));
    }

    function test_fuzz_upgradeDelegationProxy(address newImplementation) public {
        assumeNotPrecompile(newImplementation);
        vm.assume(newImplementation.code.length == 0);
        vm.etch(newImplementation, type(DelegationProxy).runtimeCode);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit UpgradeableBeaconBase.Upgraded(newImplementation);
        vm.prank(deployer);
        rewardsDistributionFacet.upgradeDelegationProxy(newImplementation);

        assertEq(rewardsDistributionFacet.implementation(), newImplementation);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STAKING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_stake_revertIf_notOperator() public {
        vm.expectRevert(RewardsDistribution__NotOperatorOrSpace.selector);
        rewardsDistributionFacet.stake(1, address(this), address(this));
    }

    function test_stake_revertIf_amountIsZero() public {
        vm.expectRevert(StakingRewards.StakingRewards__InvalidAmount.selector);
        rewardsDistributionFacet.stake(0, OPERATOR, address(this));
    }

    function test_stake_revertIf_beneficiaryIsZero() public {
        vm.expectRevert(StakingRewards.StakingRewards__InvalidAddress.selector);
        rewardsDistributionFacet.stake(1, OPERATOR, address(0));
    }

    function test_stake_revertIf_overflow() public givenOperator(OPERATOR, 0) {
        bridgeTokensForUser(address(this), 1 << 97);

        towns.approve(address(rewardsDistributionFacet), type(uint256).max);

        rewardsDistributionFacet.stake(type(uint96).max, OPERATOR, address(this));

        vm.expectRevert(stdError.arithmeticError);
        rewardsDistributionFacet.stake(type(uint96).max, OPERATOR, address(this));
    }

    function test_stake() public returns (uint256 depositId) {
        depositId = test_fuzz_stake(address(this), 1 ether, OPERATOR, 0, address(this));
    }

    function test_fuzz_stake(
        address depositor,
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary
    ) public givenOperator(operator, commissionRate) returns (uint256 depositId) {
        vm.assume(depositor != address(rewardsDistributionFacet));
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        vm.assume(amount > 0);
        commissionRate = bound(commissionRate, 0, 10_000);

        bridgeTokensForUser(depositor, amount);

        vm.startPrank(depositor);
        towns.approve(address(rewardsDistributionFacet), amount);

        vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
        emit Stake(depositor, operator, beneficiary, depositId, amount);

        depositId = rewardsDistributionFacet.stake(amount, operator, beneficiary);
        vm.stopPrank();

        verifyStake(depositor, depositId, amount, operator, commissionRate, beneficiary);
    }

    function test_fuzz_stake_toSpace(
        address depositor,
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary
    )
        public
        givenOperator(operator, commissionRate)
        givenSpaceHasPointedToOperator(space, operator)
        returns (uint256 depositId)
    {
        vm.assume(depositor != address(rewardsDistributionFacet));
        vm.assume(beneficiary != address(0) && beneficiary != operator && beneficiary != space);
        vm.assume(amount > 0);
        commissionRate = bound(commissionRate, 0, 10_000);

        bridgeTokensForUser(depositor, amount);

        vm.startPrank(depositor);
        towns.approve(address(rewardsDistributionFacet), amount);

        vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
        emit Stake(depositor, space, beneficiary, depositId, amount);

        depositId = rewardsDistributionFacet.stake(amount, space, beneficiary);
        vm.stopPrank();

        verifyStake(depositor, depositId, amount, space, commissionRate, beneficiary);
    }

    function test_fuzz_permitAndStake(
        uint256 privateKey,
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary,
        uint256 deadline
    ) public givenOperator(operator, commissionRate) {
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        vm.assume(amount > 0);
        commissionRate = bound(commissionRate, 0, 10_000);
        deadline = bound(deadline, block.timestamp, type(uint256).max);

        privateKey = boundPrivateKey(privateKey);
        address user = vm.addr(privateKey);
        bridgeTokensForUser(user, amount);

        uint256 nonce = 0; // First time permit
        bytes memory signature = _signPermitTransferFrom(
            privateKey,
            townsToken,
            amount,
            nonce,
            deadline,
            address(rewardsDistributionFacet)
        );

        vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
        emit Stake(user, operator, beneficiary, 0, amount);

        vm.prank(user);
        uint256 depositId = rewardsDistributionFacet.permitAndStake(
            amount,
            operator,
            beneficiary,
            nonce,
            deadline,
            signature
        );

        verifyStake(user, depositId, amount, operator, commissionRate, beneficiary);
    }

    //  function test_fuzz_stakeOnBehalf_revertIf_pastDeadline(
    //    uint256 deadline
    //  ) public {
    //    deadline = bound(deadline, 0, block.timestamp - 1);
    //    vm.expectRevert(RewardsDistribution__ExpiredDeadline.selector);
    //    rewardsDistributionFacet.stakeOnBehalf(
    //      1,
    //      OPERATOR,
    //      address(this),
    //      address(this),
    //      deadline,
    //      ""
    //    );
    //  }
    //
    //  function test_stakeOnBehalf_revertIf_invalidSignature() public {
    //    vm.expectRevert(RewardsDistribution__InvalidSignature.selector);
    //    rewardsDistributionFacet.stakeOnBehalf(
    //      1,
    //      OPERATOR,
    //      address(this),
    //      address(this),
    //      block.timestamp,
    //      ""
    //    );
    //  }

    function test_fuzz_stakeOnBehalf(
        uint256 privateKey,
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary,
        uint256 deadline
    ) public givenOperator(operator, commissionRate) returns (uint256 depositId) {
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        vm.assume(amount > 0);
        commissionRate = bound(commissionRate, 0, 10_000);
        deadline = bound(deadline, block.timestamp, type(uint256).max);

        privateKey = boundPrivateKey(privateKey);
        address owner = vm.addr(privateKey);

        bridgeTokensForUser(address(this), amount);

        bytes memory signature;
        {
            bytes32 structHash = keccak256(
                abi.encode(
                    STAKE_TYPEHASH,
                    amount,
                    operator,
                    beneficiary,
                    owner,
                    eip712Facet.nonces(owner),
                    deadline
                )
            );
            (uint8 v, bytes32 r, bytes32 s) = signIntent(
                privateKey,
                address(eip712Facet),
                structHash
            );
            signature = abi.encodePacked(r, s, v);
        }

        towns.approve(address(rewardsDistributionFacet), amount);

        vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
        emit Stake(owner, operator, beneficiary, 0, amount);

        depositId = rewardsDistributionFacet.stakeOnBehalf(
            amount,
            operator,
            beneficiary,
            owner,
            deadline,
            signature
        );

        verifyStake(owner, depositId, amount, operator, commissionRate, beneficiary);
    }

    function test_increaseStake_revertIf_notDepositor() public {
        uint256 depositId = test_stake();

        vm.prank(_randomAddress());
        vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
        rewardsDistributionFacet.increaseStake(depositId, 1);
    }

    function test_increaseStake_pokeOnly() public {
        test_fuzz_increaseStake(1 ether, 0, OPERATOR, 0, address(this));
    }

    function test_fuzz_increaseStake(
        uint96 amount0,
        uint96 amount1,
        address operator,
        uint256 commissionRate,
        address beneficiary
    ) public givenOperator(operator, commissionRate) {
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        amount0 = uint96(bound(amount0, 1, type(uint96).max));
        amount1 = uint96(bound(amount1, 0, type(uint96).max - amount0));
        commissionRate = bound(commissionRate, 0, 10_000);

        uint96 totalAmount = amount0 + amount1;
        bridgeTokensForUser(address(this), totalAmount);
        towns.approve(address(rewardsDistributionFacet), totalAmount);
        uint256 depositId = rewardsDistributionFacet.stake(amount0, operator, beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit IncreaseStake(depositId, amount1);

        rewardsDistributionFacet.increaseStake(depositId, amount1);

        verifyStake(address(this), depositId, totalAmount, operator, commissionRate, beneficiary);
    }

    function test_fuzz_permitAndIncreaseStake(
        uint96 amount0,
        uint96 amount1,
        uint256 privateKey,
        address operator,
        uint256 commissionRate,
        address beneficiary,
        uint256 deadline
    ) public givenOperator(operator, commissionRate) {
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        amount0 = uint96(bound(amount0, 1, type(uint96).max));
        amount1 = uint96(bound(amount1, 0, type(uint96).max - amount0));
        commissionRate = bound(commissionRate, 0, 10_000);
        deadline = bound(deadline, block.timestamp, type(uint256).max);

        privateKey = boundPrivateKey(privateKey);
        address user = vm.addr(privateKey);

        uint96 totalAmount = amount0 + amount1;
        bridgeTokensForUser(user, totalAmount);
        vm.prank(user);
        towns.approve(address(rewardsDistributionFacet), amount0);

        vm.prank(user);
        uint256 depositId = rewardsDistributionFacet.stake(amount0, operator, beneficiary);

        _permitAndIncreaseStake(depositId, amount1, privateKey, user, deadline);

        verifyStake(user, depositId, totalAmount, operator, commissionRate, beneficiary);
    }

    function _permitAndIncreaseStake(
        uint256 depositId,
        uint96 amount,
        uint256 privateKey,
        address user,
        uint256 deadline
    ) internal {
        uint256 nonce = 0; // First time permit for this amount
        bytes memory signature = _signPermitTransferFrom(
            privateKey,
            townsToken,
            amount,
            nonce,
            deadline,
            address(rewardsDistributionFacet)
        );

        vm.expectEmit(true, true, true, false, address(rewardsDistributionFacet));
        emit IncreaseStake(depositId, amount);

        vm.prank(user);
        rewardsDistributionFacet.permitAndIncreaseStake(
            depositId,
            amount,
            nonce,
            deadline,
            signature
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         REDELEGATE                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_redelegate_revertIf_notOperator() public {
        uint256 depositId = test_stake();

        vm.expectRevert(RewardsDistribution__NotOperatorOrSpace.selector);
        rewardsDistributionFacet.redelegate(depositId, _randomAddress());
    }

    function test_redelegate_revertIf_notDepositor() public {
        uint256 depositId = test_stake();

        address delegatee = _randomAddress();
        registerOperator(delegatee);

        vm.prank(_randomAddress());
        vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
        rewardsDistributionFacet.redelegate(depositId, delegatee);
    }

    function test_fuzz_redelegate_revertIf_sameOperator(
        uint96 amount,
        address operator,
        uint256 commissionRate
    ) public {
        uint256 depositId = test_fuzz_stake(
            address(this),
            amount,
            operator,
            commissionRate,
            address(this)
        );

        vm.expectRevert(Towns.DelegateeSameAsCurrent.selector);
        rewardsDistributionFacet.redelegate(depositId, operator);
    }

    function test_fuzz_redelegate(
        uint96 amount,
        address operator0,
        uint256 commissionRate0,
        address operator1,
        uint256 commissionRate1
    ) public givenOperator(operator1, commissionRate1) {
        vm.assume(operator0 != operator1);
        vm.assume(operator1 != address(this));
        commissionRate1 = bound(commissionRate1, 0, 10_000);

        uint256 depositId = test_fuzz_stake(
            address(this),
            amount,
            operator0,
            commissionRate0,
            address(this)
        );

        vm.expectEmit(address(rewardsDistributionFacet));
        emit Redelegate(depositId, operator1);

        rewardsDistributionFacet.redelegate(depositId, operator1);

        assertEq(rewardsDistributionFacet.treasureByBeneficiary(operator0).earningPower, 0);

        verifyStake(address(this), depositId, amount, operator1, commissionRate1, address(this));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     CHANGE BENEFICIARY                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_changeBeneficiary_revertIf_notDepositor() public {
        uint256 depositId = test_stake();

        vm.prank(_randomAddress());
        vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
        rewardsDistributionFacet.changeBeneficiary(depositId, _randomAddress());
    }

    function test_changeBeneficiary_revertIf_newBeneficiaryIsZero() public {
        uint256 depositId = test_stake();

        vm.expectRevert(StakingRewards.StakingRewards__InvalidAddress.selector);
        rewardsDistributionFacet.changeBeneficiary(depositId, address(0));
    }

    function test_changeBeneficiary() public {
        test_fuzz_changeBeneficiary(1 ether, OPERATOR, 0, _randomAddress());
    }

    function test_fuzz_changeBeneficiary(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary
    ) public {
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        commissionRate = bound(commissionRate, 0, 10_000);

        uint256 depositId = test_fuzz_stake(
            address(this),
            amount,
            operator,
            commissionRate,
            address(this)
        );

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ChangeBeneficiary(depositId, beneficiary);

        rewardsDistributionFacet.changeBeneficiary(depositId, beneficiary);

        verifyStake(address(this), depositId, amount, operator, commissionRate, beneficiary);
    }

    function test_fuzz_changeBeneficiary_sameBeneficiary(
        uint96 amount,
        address operator,
        uint256 commissionRate0,
        uint256 commissionRate1,
        address beneficiary
    ) public {
        vm.assume(beneficiary != address(0) && beneficiary != operator);
        commissionRate1 = bound(commissionRate1, 0, 10_000);

        uint256 depositId = test_fuzz_stake(
            address(this),
            amount,
            operator,
            commissionRate0,
            beneficiary
        );

        resetOperatorCommissionRate(operator, commissionRate1);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ChangeBeneficiary(depositId, beneficiary);

        rewardsDistributionFacet.changeBeneficiary(depositId, beneficiary);

        verifyStake(address(this), depositId, amount, operator, commissionRate1, beneficiary);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          WITHDRAW                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_initiateWithdraw_revertIf_notDepositor() public {
        uint256 depositId = test_stake();

        vm.prank(_randomAddress());
        vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
        rewardsDistributionFacet.initiateWithdraw(depositId);
    }

    function test_initiateWithdraw() public returns (uint256 depositId) {
        return test_fuzz_initiateWithdraw(1 ether, OPERATOR, 0, address(this));
    }

    function test_fuzz_initiateWithdraw(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary
    ) public returns (uint256 depositId) {
        depositId = test_fuzz_stake(address(this), amount, operator, commissionRate, beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit InitiateWithdraw(address(this), depositId, amount);

        rewardsDistributionFacet.initiateWithdraw(depositId);

        verifyWithdraw(address(this), depositId, amount, 0, operator, beneficiary);
    }

    function test_fuzz_initiateWithdraw_rewardsNotDiluted(
        address[2] memory depositors,
        uint96[2] memory amounts,
        address operator,
        uint256 timeLapse
    ) public {
        vm.assume(depositors[0] != depositors[1]);
        vm.assume(operator != OPERATOR && operator != depositors[0] && operator != depositors[1]);
        vm.assume(OPERATOR != depositors[0] && OPERATOR != depositors[1]);
        amounts[1] = uint96(bound(amounts[1], 0, type(uint96).max - amounts[0]));
        timeLapse = bound(timeLapse, 0, rewardDuration);

        test_notifyRewardAmount();

        uint256 depositId0 = test_fuzz_stake(depositors[0], amounts[0], operator, 0, depositors[0]);
        uint256 depositId1 = test_fuzz_stake(depositors[1], amounts[1], OPERATOR, 0, depositors[1]);

        // immediately initiate withdraw for the first depositor
        vm.prank(depositors[0]);
        rewardsDistributionFacet.initiateWithdraw(depositId0);

        skip(timeLapse);

        // poke the second depositor
        vm.prank(depositors[1]);
        rewardsDistributionFacet.increaseStake(depositId1, 0);

        uint256 currentReward = rewardsDistributionFacet.currentReward(depositors[1]);

        StakingState memory state = rewardsDistributionFacet.stakingState();
        uint256 rewardRate = state.rewardRate;
        uint256 rewardPerTokenAccumulated = state.rewardPerTokenAccumulated;

        // verify the second depositor receives all the rewards
        assertEq(
            rewardPerTokenAccumulated,
            rewardRate.fullMulDiv(timeLapse, amounts[1]),
            "rewardPerTokenAccumulated"
        );
        assertEq(
            currentReward,
            rewardRate.fullMulDiv(timeLapse, StakingRewards.SCALE_FACTOR),
            "currentReward"
        );
    }

    function test_initiateWithdraw_revertIf_initiateWithdrawAgain() public {
        uint256 depositId = test_initiateWithdraw();

        vm.expectRevert(Towns.DelegateeSameAsCurrent.selector);
        rewardsDistributionFacet.initiateWithdraw(depositId);
    }

    function test_fuzz_initiateWithdraw_revertIf_increaseStake(uint96 amount) public {
        uint256 depositId = test_initiateWithdraw();

        vm.expectRevert(RewardsDistribution__NotOperatorOrSpace.selector);
        rewardsDistributionFacet.increaseStake(depositId, amount);
    }

    function test_fuzz_initiateWithdraw_redelegate(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary
    ) public givenOperator(operator, commissionRate) {
        vm.assume(operator != beneficiary && operator != OPERATOR);
        commissionRate = bound(commissionRate, 0, 10_000);

        uint256 depositId = test_fuzz_initiateWithdraw(amount, OPERATOR, 0, beneficiary);

        rewardsDistributionFacet.redelegate(depositId, operator);

        verifyStake(address(this), depositId, amount, operator, commissionRate, beneficiary);
    }

    function test_initiateWithdraw_revertIf_changeBeneficiary() public {
        uint256 depositId = test_initiateWithdraw();

        address newBeneficiary = _randomAddress();
        vm.expectRevert(RewardsDistribution__NotOperatorOrSpace.selector);
        rewardsDistributionFacet.changeBeneficiary(depositId, newBeneficiary);
    }

    function test_fuzz_initiateWithdraw_claimReward(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary,
        uint256 timeLapse
    ) public {
        timeLapse = bound(timeLapse, 0, rewardDuration);

        test_notifyRewardAmount();
        uint256 depositId = test_fuzz_stake(
            address(this),
            amount,
            operator,
            commissionRate,
            beneficiary
        );

        skip(timeLapse);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit InitiateWithdraw(address(this), depositId, amount);

        rewardsDistributionFacet.initiateWithdraw(depositId);

        uint256 currentReward = rewardsDistributionFacet.currentReward(beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(beneficiary, beneficiary, currentReward);

        vm.prank(beneficiary);
        uint256 reward = rewardsDistributionFacet.claimReward(beneficiary, beneficiary);

        assertEq(reward, currentReward, "reward");
    }

    function test_initiateWithdraw_stopEarningRewards() public {
        // Step 1: Stake and notify rewards
        address depositor = makeAddr("DEPOSITOR");

        test_notifyRewardAmount();
        test_stake();
        uint256 depositId = test_fuzz_stake(
            depositor,
            1 ether,
            makeAddr("OPERATOR2"),
            0,
            depositor
        );

        // Step 2: Verify earnings are accumulating before the initiation of withdrawal
        skip(rewardDuration / 2);

        vm.prank(depositor);
        uint256 initialRewards = rewardsDistributionFacet.claimReward(depositor, depositor);
        assertTrue(initialRewards > 0);

        // Step 3: Initiate withdrawal
        vm.prank(depositor);
        rewardsDistributionFacet.initiateWithdraw(depositId);

        // Step 4: Verify that no new rewards are accumulating after the withdrawal is initiated
        skip(rewardDuration / 2);
        uint256 postWithdrawRewards = rewardsDistributionFacet.currentReward(depositor);
        assertEq(postWithdrawRewards, 0);
    }

    function test_withdraw_revertIf_notDepositor() public {
        uint256 depositId = test_initiateWithdraw();

        vm.prank(_randomAddress());
        vm.expectRevert(RewardsDistribution__NotDepositOwner.selector);
        rewardsDistributionFacet.withdraw(depositId);
    }

    function test_withdraw_revertIf_stillLocked() public {
        uint256 depositId = test_initiateWithdraw();

        address proxy = rewardsDistributionFacet.delegationProxyById(depositId);
        uint256 cd = towns.lockExpiration(proxy);

        vm.warp(cd - 1);

        vm.expectRevert(SafeTransferLib.TransferFromFailed.selector);
        rewardsDistributionFacet.withdraw(depositId);
    }

    function test_withdraw() public returns (uint256 depositId) {
        return test_fuzz_withdraw(1 ether, OPERATOR, 0, address(this));
    }

    function test_fuzz_withdraw(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary
    ) public returns (uint256 depositId) {
        depositId = test_fuzz_initiateWithdraw(amount, operator, commissionRate, beneficiary);

        address proxy = rewardsDistributionFacet.delegationProxyById(depositId);
        uint256 cd = towns.lockExpiration(proxy);

        vm.warp(cd);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit Withdraw(depositId, amount);

        rewardsDistributionFacet.withdraw(depositId);

        verifyWithdraw(address(this), depositId, 0, amount, operator, beneficiary);
    }

    function test_withdraw_redelegate_shouldResultInZeroStake() public {
        uint256 depositId = test_withdraw();

        rewardsDistributionFacet.redelegate(depositId, OPERATOR);

        verifyStake(address(this), depositId, 0, OPERATOR, 0, address(this));
    }

    function test_withdraw_revertIf_withdrawAgain() public {
        uint256 depositId = test_withdraw();

        vm.expectRevert(RewardsDistribution__NoPendingWithdrawal.selector);
        rewardsDistributionFacet.withdraw(depositId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        NOTIFY REWARD                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_notifyRewardAmount_revertIf_notNotifier() public {
        vm.prank(_randomAddress());
        vm.expectRevert(RewardsDistribution__NotRewardNotifier.selector);
        rewardsDistributionFacet.notifyRewardAmount(1);
    }

    function test_fuzz_notifyRewardAmount_revertIf_invalidRewardRate(uint256 reward) public {
        reward = bound(reward, 0, rewardDuration - 1);
        vm.prank(NOTIFIER);
        vm.expectRevert(StakingRewards.StakingRewards__InvalidRewardRate.selector);
        rewardsDistributionFacet.notifyRewardAmount(reward);
    }

    function test_fuzz_notifyRewardAmount_revertIf_insufficientReward(uint256 reward) public {
        reward = boundReward(reward);
        vm.prank(NOTIFIER);
        vm.expectRevert(StakingRewards.StakingRewards__InsufficientReward.selector);
        rewardsDistributionFacet.notifyRewardAmount(reward);
    }

    function test_notifyRewardAmount() public {
        test_fuzz_notifyRewardAmount(1 ether);
    }

    function test_fuzz_notifyRewardAmount(uint256 reward) public {
        reward = boundReward(reward);
        bridgeTokensForUser(address(rewardsDistributionFacet), reward);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit NotifyRewardAmount(NOTIFIER, reward);

        vm.prank(NOTIFIER);
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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CLAIM REWARD                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_fuzz_claimReward_revertIf_notBeneficiary(address beneficiary) public {
        vm.assume(beneficiary != address(this) && beneficiary != OPERATOR);
        vm.expectRevert(RewardsDistribution__NotBeneficiary.selector);
        rewardsDistributionFacet.claimReward(beneficiary, address(this));
    }

    function test_fuzz_claimReward_revertIf_notOperatorClaimer(
        address claimer,
        address operator
    ) public givenOperator(operator, 0) givenSpaceHasPointedToOperator(space, operator) {
        vm.assume(address(this) != claimer && address(this) != operator);
        setOperatorClaimAddress(operator, claimer);

        vm.expectRevert(RewardsDistribution__NotClaimer.selector);
        rewardsDistributionFacet.claimReward(operator, address(this));

        vm.expectRevert(RewardsDistribution__NotClaimer.selector);
        rewardsDistributionFacet.claimReward(space, address(this));
    }

    function test_claimReward_byBeneficiary() public {
        test_fuzz_claimReward_byBeneficiary(
            makeAddr("depositor"),
            1 ether,
            makeAddr("operator"),
            0,
            makeAddr("beneficiary"),
            1 ether,
            rewardDuration
        );
    }

    function test_fuzz_claimReward_byBeneficiary(
        address depositor,
        uint96 amount,
        address operator,
        uint256 commissionRate,
        address beneficiary,
        uint256 rewardAmount,
        uint256 timeLapse
    ) public {
        vm.assume(depositor != address(this) && depositor != address(rewardsDistributionFacet));
        vm.assume(operator != OPERATOR && operator != address(this));
        vm.assume(
            beneficiary != operator &&
                beneficiary != OPERATOR &&
                beneficiary != address(this) &&
                beneficiary != address(rewardsDistributionFacet)
        );
        amount = uint96(bound(amount, 1, type(uint96).max - 1 ether));
        timeLapse = bound(timeLapse, 0, rewardDuration);

        test_fuzz_notifyRewardAmount(rewardAmount);
        test_stake();
        test_fuzz_stake(depositor, amount, operator, commissionRate, beneficiary);

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(beneficiary, beneficiary, currentReward);

        vm.prank(beneficiary);
        uint256 reward = rewardsDistributionFacet.claimReward(beneficiary, beneficiary);

        verifyClaim(beneficiary, beneficiary, reward, currentReward, timeLapse);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_claimReward_multipleDepositors(
        address[32] memory depositors,
        uint256[32] memory amounts,
        address beneficiary,
        uint256 rewardAmount,
        uint256 timeLapse
    ) public {
        vm.assume(beneficiary != address(rewardsDistributionFacet));
        depositors[0] = beneficiary;
        sanitizeAmounts(amounts);
        timeLapse = bound(timeLapse, 0, rewardDuration);

        test_fuzz_notifyRewardAmount(rewardAmount);

        for (uint256 i; i < 32; ++i) {
            bridgeTokensForUser(depositors[i], amounts[i]);

            vm.startPrank(depositors[i]);
            towns.approve(address(rewardsDistributionFacet), amounts[i]);
            rewardsDistributionFacet.stake(uint96(amounts[i]), OPERATOR, depositors[i]);
            vm.stopPrank();
        }

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(beneficiary);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(beneficiary, beneficiary, currentReward);

        vm.prank(beneficiary);
        uint256 reward = rewardsDistributionFacet.claimReward(beneficiary, beneficiary);

        verifyClaim(beneficiary, beneficiary, reward, currentReward, timeLapse);
    }

    function test_fuzz_claimReward_byOperator(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        uint256 rewardAmount,
        uint256 timeLapse
    ) public {
        vm.assume(operator != address(this) && operator != address(rewardsDistributionFacet));
        timeLapse = bound(timeLapse, 0, rewardDuration);
        amount = uint96(bound(amount, 1 ether, type(uint96).max));

        test_fuzz_notifyRewardAmount(rewardAmount);
        test_fuzz_stake(address(this), amount, operator, commissionRate, address(this));

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(operator);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(operator, operator, currentReward);

        vm.prank(operator);
        uint256 reward = rewardsDistributionFacet.claimReward(operator, operator);

        verifyClaim(operator, operator, reward, currentReward, timeLapse);
    }

    function test_fuzz_claimReward_bySpaceOperator(
        uint96 amount,
        address operator,
        uint256 commissionRate,
        uint256 rewardAmount,
        uint256 timeLapse
    ) public {
        vm.assume(operator != address(this) && operator != address(rewardsDistributionFacet));
        timeLapse = bound(timeLapse, 0, rewardDuration);
        amount = uint96(bound(amount, 1 ether, type(uint96).max));

        test_fuzz_notifyRewardAmount(rewardAmount);
        test_fuzz_stake_toSpace(address(this), amount, operator, commissionRate, address(this));

        skip(timeLapse);

        uint256 currentReward = rewardsDistributionFacet.currentReward(space);

        vm.expectEmit(address(rewardsDistributionFacet));
        emit ClaimReward(space, operator, currentReward);

        vm.prank(operator);
        uint256 reward = rewardsDistributionFacet.claimReward(space, operator);

        verifyClaim(space, operator, reward, currentReward, timeLapse);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_getDepositsByDepositor(uint8 count) public {
        vm.assume(count != 0);
        bridgeTokensForUser(address(this), 1 ether * uint256(count));
        towns.approve(address(rewardsDistributionFacet), type(uint256).max);
        for (uint256 i; i < count; ++i) {
            rewardsDistributionFacet.stake(1 ether, OPERATOR, address(this));
        }
        uint256[] memory deposits = rewardsDistributionFacet.getDepositsByDepositor(address(this));
        assertEq(deposits.length, count, "length");
        for (uint256 i; i < count; ++i) {
            assertEq(deposits[i], i, "depositId");
        }
    }

    function test_currentSpaceDelegationReward() public {
        test_fuzz_currentSpaceDelegationReward(255);
    }

    /// forge-config: default.fuzz.runs = 64
    function test_fuzz_currentSpaceDelegationReward(uint8 count) public {
        vm.assume(count != 0);
        uint256 commissionRate = 1000;
        resetOperatorCommissionRate(OPERATOR, commissionRate);

        bridgeTokensForUser(address(this), 1 ether * uint256(count));
        towns.approve(address(rewardsDistributionFacet), type(uint256).max);
        for (uint256 i; i < count; ++i) {
            address _space = deploySpace(deployer);
            pointSpaceToOperator(_space, OPERATOR);
            rewardsDistributionFacet.stake(1 ether, _space, address(this));
        }

        test_notifyRewardAmount();

        StakingState memory state = rewardsDistributionFacet.stakingState();
        uint256 rewardRate = state.rewardRate;

        skip(rewardDuration);

        assertApproxEqRel(
            rewardsDistributionFacet.currentSpaceDelegationReward(OPERATOR),
            (rewardRate.fullMulDiv(rewardDuration, StakingRewards.SCALE_FACTOR) * commissionRate) /
                10_000,
            1e15
        );
    }

    function test_stakeOnBehalf_revertIf_ownerIsSelf() public {
        vm.expectRevert(RewardsDistribution__InvalidOwner.selector);
        rewardsDistributionFacet.stakeOnBehalf(
            1 ether,
            OPERATOR,
            address(this),
            baseRegistry,
            0,
            ""
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          HELPERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _signPermitTransferFrom(
        uint256 privateKey,
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        address spender
    ) internal view returns (bytes memory) {
        bytes32 tokenPermissions = keccak256(
            abi.encode(PermitHash._TOKEN_PERMISSIONS_TYPEHASH, token, amount)
        );

        bytes32 structHash = keccak256(
            abi.encode(
                PermitHash._PERMIT_TRANSFER_FROM_TYPEHASH,
                tokenPermissions,
                spender,
                nonce,
                deadline
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = signIntent(privateKey, PERMIT2, structHash);
        return bytes.concat(r, s, bytes1(v));
    }
}
