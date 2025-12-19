// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {FeatureCondition, FeatureConditionSet, FeatureConditionDisabled, FeatureNotActive, FeatureAlreadyExists, InvalidToken, InvalidInterface, InvalidTotalSupply, InvalidThreshold, ConditionType} from "src/factory/facets/feature/FeatureManagerMod.sol";

// contracts
import {FeatureManagerFacet} from "src/factory/facets/feature/FeatureManagerFacet.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";
import {BaseRegistryTest} from "test/base/registry/BaseRegistry.t.sol";

// mocks
import {MockERC20} from "test/mocks/MockERC20.sol";

contract FeatureManagerTest is BaseSetup, BaseRegistryTest {
    FeatureManagerFacet featureManagerFacet;

    uint256 private constant _ZERO_SENTINEL = 0xfbb67fda52d4bfb8bf;
    bytes32 constant ZERO_SENTINEL_BYTES32 = bytes32(_ZERO_SENTINEL);
    address constant ZERO_SENTINEL_ADDRESS = address(uint160(_ZERO_SENTINEL));

    // keccak256("test.feature")
    bytes32 constant TEST_FEATURE_ID =
        0x69ee5871a65c89c042656feb37c9971ee294380d6b43c379eed8a7bfa140c5e7;
    uint96 constant TEST_THRESHOLD = 100 ether;

    address operator = _randomAddress();
    uint256 commissionRate = 1000; // 10%

    function setUp() public override(BaseSetup, BaseRegistryTest) {
        super.setUp();
        featureManagerFacet = FeatureManagerFacet(spaceFactory);
    }

    modifier givenTokenFeatureCondition(bytes32 featureId, address to, uint96 amount) {
        vm.assume(featureId != ZERO_SENTINEL_BYTES32);
        vm.assume(amount > 0 && amount < type(uint96).max);

        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: amount,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(bridge);
        towns.mint(to, amount);

        vm.prank(deployer);
        vm.expectEmit(address(featureManagerFacet));
        emit FeatureConditionSet(featureId, condition);
        featureManagerFacet.setFeatureCondition(featureId, condition);
        _;
    }

    modifier givenStakingPowerFeatureCondition(bytes32 featureId, address to, uint96 amount) {
        vm.assume(featureId != ZERO_SENTINEL_BYTES32);
        vm.assume(amount > 0 && amount < type(uint96).max);

        FeatureCondition memory condition = FeatureCondition({
            checker: address(rewardsDistributionFacet),
            threshold: amount,
            active: true,
            extraData: "",
            conditionType: ConditionType.StakingPower
        });

        vm.prank(bridge);
        towns.mint(to, amount);

        vm.prank(deployer);
        vm.expectEmit(address(featureManagerFacet));
        emit FeatureConditionSet(featureId, condition);
        featureManagerFacet.setFeatureCondition(featureId, condition);
        _;
    }

    modifier givenTokensAreMinted(address to, uint96 amount) {
        vm.assume(amount > 0 && amount < type(uint96).max);
        vm.prank(bridge);
        towns.mint(to, amount);
        _;
    }

    function test_setTokenFeatureCondition(
        bytes32 featureId,
        address to,
        uint96 amount
    ) external givenTokenFeatureCondition(featureId, to, amount) {
        FeatureCondition memory currentCondition = featureManagerFacet.getFeatureCondition(
            featureId
        );
        assertEq(currentCondition.checker, address(townsToken));
        assertEq(uint8(currentCondition.conditionType), uint8(ConditionType.VotingPower));
        assertEq(currentCondition.active, true);
        assertEq(currentCondition.extraData, "");
    }

    function test_setStakingPowerFeatureCondition(
        bytes32 featureId,
        address to,
        uint96 amount
    ) external givenStakingPowerFeatureCondition(featureId, to, amount) {
        FeatureCondition memory currentCondition = featureManagerFacet.getFeatureCondition(
            featureId
        );
        assertEq(currentCondition.checker, address(rewardsDistributionFacet));
        assertEq(uint8(currentCondition.conditionType), uint8(ConditionType.StakingPower));
        assertEq(currentCondition.active, true);
        assertEq(currentCondition.extraData, "");
    }

    function test_updateFeatureCondition(
        bytes32 featureId,
        address to,
        uint96 amount
    ) external givenTokenFeatureCondition(featureId, to, amount) {
        FeatureCondition memory newCondition = FeatureCondition({
            checker: address(rewardsDistributionFacet),
            threshold: 20 ether,
            active: true,
            extraData: "",
            conditionType: ConditionType.StakingPower
        });
        vm.prank(deployer);
        vm.expectEmit(address(featureManagerFacet));
        emit FeatureConditionSet(featureId, newCondition);
        featureManagerFacet.updateFeatureCondition(featureId, newCondition);
    }

    function test_revertWith_updateFeatureCondition_featureNotActive()
        external
        givenTokensAreMinted(deployer, TEST_THRESHOLD)
    {
        vm.prank(deployer);
        vm.expectRevert(FeatureNotActive.selector);
        featureManagerFacet.updateFeatureCondition(
            TEST_FEATURE_ID,
            FeatureCondition({
                checker: address(townsToken),
                threshold: TEST_THRESHOLD,
                active: false,
                extraData: "",
                conditionType: ConditionType.VotingPower
            })
        );
    }

    function test_getFeatureConditions() external givenTokensAreMinted(deployer, TEST_THRESHOLD) {
        bytes32[] memory featureIds = new bytes32[](10);

        for (uint256 i; i < featureIds.length; i++) {
            featureIds[i] = _randomBytes32();
        }

        uint256 length = featureIds.length;

        FeatureCondition[] memory conditions = new FeatureCondition[](length);

        for (uint256 i; i < length; i++) {
            conditions[i] = FeatureCondition({
                checker: address(townsToken),
                threshold: 0,
                active: true,
                extraData: "",
                conditionType: ConditionType.VotingPower
            });

            vm.prank(deployer);
            featureManagerFacet.setFeatureCondition(featureIds[i], conditions[i]);
        }

        FeatureCondition[] memory currentConditions = featureManagerFacet.getFeatureConditions();

        for (uint256 i; i < currentConditions.length; i++) {
            FeatureCondition memory currentCondition = currentConditions[i];
            assertEq(currentCondition.checker, address(townsToken));
            assertEq(currentCondition.threshold, 0);
            assertEq(currentCondition.active, true);
        }
    }

    function test_revertWith_setFeatureCondition_featureAlreadyExists()
        external
        givenTokensAreMinted(deployer, TEST_THRESHOLD)
    {
        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: 0,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(deployer);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);

        vm.prank(deployer);
        vm.expectRevert(FeatureAlreadyExists.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_revertWith_setFeatureCondition_invalidToken() external {
        FeatureCondition memory condition = FeatureCondition({
            checker: address(0),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidToken.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_revertWith_setFeatureCondition_invalidInterface() external {
        MockERC20 mockToken = new MockERC20("Mock Token", "MTK");

        FeatureCondition memory condition = FeatureCondition({
            checker: address(mockToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidInterface.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_revertWith_setFeatureCondition_invalidTotalSupply() external {
        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidTotalSupply.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_revertWith_setFeatureCondition_invalidThreshold()
        external
        givenTokensAreMinted(deployer, TEST_THRESHOLD - 10 ether)
    {
        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidThreshold.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_disableFeatureCondition(address to) external {
        setVotingFeatureCondition(to);

        vm.prank(deployer);
        vm.expectEmit(address(featureManagerFacet));
        emit FeatureConditionDisabled(TEST_FEATURE_ID);
        featureManagerFacet.disableFeatureCondition(TEST_FEATURE_ID);

        FeatureCondition memory currentCondition = featureManagerFacet.getFeatureCondition(
            TEST_FEATURE_ID
        );
        assertFalse(currentCondition.active);
    }

    function test_revertWith_disableFeatureCondition_featureNotActive() external {
        vm.prank(deployer);
        vm.expectRevert(FeatureNotActive.selector);
        featureManagerFacet.disableFeatureCondition(TEST_FEATURE_ID);
    }

    function test_checkFeatureCondition() external {
        address space = _randomAddress();
        address to = _randomAddress();

        setVotingFeatureCondition(to);

        vm.assertFalse(featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space));

        vm.prank(to);
        towns.delegate(space);

        vm.assertTrue(featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space));
    }

    function test_getFeatureConditionsForSpace(address to, address space) external {
        vm.assume(to != address(0));
        vm.assume(space != address(0));
        vm.assume(to != space);

        setVotingFeatureCondition(to);

        // get feature conditions for space
        FeatureCondition[] memory conditions = featureManagerFacet.getFeatureConditionsForSpace(
            space
        );

        // no conditions since we haven't delegated
        assertEq(conditions.length, 0);

        // delegate to space
        vm.prank(to);
        towns.delegate(space);

        // get feature conditions for space
        conditions = featureManagerFacet.getFeatureConditionsForSpace(space);
        assertEq(conditions.length, 1);

        // disable feature condition
        vm.prank(deployer);
        featureManagerFacet.disableFeatureCondition(TEST_FEATURE_ID);

        // get feature conditions for space
        conditions = featureManagerFacet.getFeatureConditionsForSpace(space);
        assertEq(conditions.length, 0);
    }

    function test_checkFeatureCondition_featureNotActive(address space) external view {
        vm.assume(space != address(0));
        vm.assertFalse(featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space));
    }

    function test_checkFeatureCondition_noThreshold(address space) external {
        vm.assume(space != address(0));

        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: 0,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(bridge);
        towns.mint(deployer, TEST_THRESHOLD);

        vm.prank(deployer);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);

        vm.assertTrue(featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space));
    }

    function setVotingFeatureCondition(address to) internal {
        vm.assume(to != address(0));
        vm.assume(to != deployer);

        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        vm.prank(bridge);
        towns.mint(to, TEST_THRESHOLD);

        vm.prank(deployer);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           E2E TESTS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Tests that feature conditions are properly validated after staking tokens
    /// @dev This test verifies the end-to-end flow: staking tokens to a space, then checking
    ///      if the space meets a feature condition based on the staked amount
    function test_stake_featureConditionIsActive()
        external
        givenOperator(operator, commissionRate)
    {
        uint256 depositId;
        uint96 amount = 10 ether; // 10 $TOWN
        address depositor = _randomAddress(); // Towns checker holder

        // Mint tokens to depositor via bridge (simulates cross-chain checker bridging)
        bridgeTokensForUser(depositor, amount);

        // Configure space to delegate rewards to the operator
        pointSpaceToOperator(everyoneSpace, operator);

        // Create a feature condition requiring exactly the staked amount (10 TOWN)
        bytes32 votingFeatureId = _randomBytes32();
        FeatureCondition memory condition = FeatureCondition({
            checker: address(townsToken),
            threshold: amount, // 10 TOWN threshold
            active: true,
            extraData: "",
            conditionType: ConditionType.VotingPower
        });

        // Set the feature condition for the test feature
        vm.prank(deployer);
        featureManagerFacet.setFeatureCondition(votingFeatureId, condition);

        // Create feature condition for checking the staking power of the user
        bytes32 stakingFeatureId = _randomBytes32();
        FeatureCondition memory stakingCondition = FeatureCondition({
            checker: address(rewardsDistributionFacet),
            threshold: amount,
            active: true,
            extraData: "",
            conditionType: ConditionType.StakingPower
        });

        vm.prank(deployer);
        featureManagerFacet.setFeatureCondition(stakingFeatureId, stakingCondition);

        // Verify that the space does not meet the voting feature condition yet
        vm.assertFalse(featureManagerFacet.checkFeatureCondition(votingFeatureId, everyoneSpace));

        // Verify that the user does not meet the staking feature condition yet
        vm.assertFalse(featureManagerFacet.checkFeatureCondition(stakingFeatureId, depositor));

        // Stake tokens: depositor stakes 10 TOWN to the space, with themselves as beneficiary
        vm.startPrank(depositor);
        towns.approve(address(rewardsDistributionFacet), amount);
        depositId = rewardsDistributionFacet.stake(amount, everyoneSpace, depositor);
        vm.stopPrank();

        // Verify the stake was created correctly with proper delegation and commission
        verifyStake(depositor, depositId, amount, everyoneSpace, commissionRate, depositor);

        // Verify that the space now meets the voting feature condition due to the staked tokens
        vm.assertTrue(featureManagerFacet.checkFeatureCondition(votingFeatureId, everyoneSpace));

        // Verify that the user now meets the staking feature condition due to the staked tokens
        vm.assertTrue(featureManagerFacet.checkFeatureCondition(stakingFeatureId, depositor));
    }
}
