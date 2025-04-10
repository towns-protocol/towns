// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IFeatureManagerFacetBase} from "src/factory/facets/feature/IFeatureManagerFacet.sol";

// libraries
import {FeatureCondition} from "src/factory/facets/feature/FeatureConditionLib.sol";

// contracts
import {FeatureManagerFacet} from "src/factory/facets/feature/FeatureManagerFacet.sol";
import {Towns} from "src/tokens/towns/base/Towns.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

// mocks
import {MockERC20} from "test/mocks/MockERC20.sol";

contract FeatureManagerTest is BaseSetup, IFeatureManagerFacetBase {
    FeatureManagerFacet featureManagerFacet;
    Towns towns;

    bytes32 constant ZERO_SENTINEL_BYTES32 = bytes32(0);

    // keccak256("test.feature")
    bytes32 constant TEST_FEATURE_ID =
        0x69ee5871a65c89c042656feb37c9971ee294380d6b43c379eed8a7bfa140c5e7;
    uint256 constant TEST_THRESHOLD = 100 ether;

    function setUp() public override {
        super.setUp();
        featureManagerFacet = FeatureManagerFacet(spaceFactory);
        towns = Towns(townsToken);
    }

    modifier givenFeatureConditionIsSet(
        bytes32 featureId,
        FeatureCondition memory condition,
        address to,
        uint256 amount
    ) {
        vm.assume(amount > 0 && amount < type(uint256).max);
        vm.assume(condition.threshold > 0 && condition.threshold < amount);
        vm.assume(to != ZERO_SENTINEL);
        vm.assume(to != address(0));
        vm.assume(featureId != ZERO_SENTINEL_BYTES32);

        condition.token = address(townsToken);

        vm.prank(bridge);
        towns.mint(to, amount);

        vm.prank(deployer);
        vm.expectEmit(address(featureManagerFacet));
        emit FeatureConditionSet(featureId, condition);
        featureManagerFacet.setFeatureCondition(featureId, condition);
        _;
    }

    modifier givenTokensAreMinted(address to, uint256 amount) {
        vm.assume(amount > 0 && amount < type(uint256).max);
        vm.prank(bridge);
        towns.mint(to, amount);
        _;
    }

    function test_setFeatureCondition(
        bytes32 featureId,
        FeatureCondition memory condition,
        address to,
        uint256 amount
    ) external givenFeatureConditionIsSet(featureId, condition, to, amount) {
        FeatureCondition memory currentCondition = featureManagerFacet.getFeatureCondition(
            featureId
        );
        assertEq(currentCondition.token, address(townsToken));
        assertEq(currentCondition.threshold, condition.threshold);
        assertEq(currentCondition.active, condition.active);
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
                token: address(townsToken),
                threshold: 0,
                active: true,
                extraData: ""
            });

            vm.prank(deployer);
            featureManagerFacet.setFeatureCondition(featureIds[i], conditions[i]);
        }

        FeatureCondition[] memory currentConditions = featureManagerFacet.getFeatureConditions();

        for (uint256 i; i < currentConditions.length; i++) {
            FeatureCondition memory currentCondition = currentConditions[i];
            assertEq(currentCondition.token, address(townsToken));
            assertEq(currentCondition.threshold, 0);
            assertEq(currentCondition.active, true);
        }
    }

    function test_revertWith_setFeatureCondition_invalidToken() external {
        FeatureCondition memory condition = FeatureCondition({
            token: address(0),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: ""
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidToken.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_revertWith_setFeatureCondition_invalidInterface() external {
        MockERC20 mockToken = new MockERC20("Mock Token", "MTK");

        FeatureCondition memory condition = FeatureCondition({
            token: address(mockToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: ""
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidInterface.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_revertWith_setFeatureCondition_invalidTotalSupply() external {
        FeatureCondition memory condition = FeatureCondition({
            token: address(townsToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: ""
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
            token: address(townsToken),
            threshold: TEST_THRESHOLD,
            active: true,
            extraData: ""
        });

        vm.prank(deployer);
        vm.expectRevert(InvalidThreshold.selector);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);
    }

    function test_disableFeatureCondition(
        bytes32 featureId,
        FeatureCondition memory condition,
        address to,
        uint256 amount
    ) external givenFeatureConditionIsSet(featureId, condition, to, amount) {
        vm.assume(condition.active == true);

        vm.prank(deployer);
        vm.expectEmit(address(featureManagerFacet));
        emit FeatureConditionDisabled(featureId);
        featureManagerFacet.disableFeatureCondition(featureId);

        FeatureCondition memory currentCondition = featureManagerFacet.getFeatureCondition(
            featureId
        );
        assertFalse(currentCondition.active);
    }

    function test_revertWith_disableFeatureCondition_featureNotActive() external {
        vm.prank(deployer);
        vm.expectRevert(FeatureNotActive.selector);
        featureManagerFacet.disableFeatureCondition(TEST_FEATURE_ID);
    }

    function test_checkFeatureCondition(
        bytes32 featureId,
        FeatureCondition memory condition,
        address to,
        uint256 amount,
        address space
    ) external givenFeatureConditionIsSet(featureId, condition, to, amount) {
        vm.assume(condition.active == true);
        vm.assume(space != address(0));

        vm.assertFalse(featureManagerFacet.checkFeatureCondition(featureId, space));

        vm.prank(to);
        towns.delegate(space);

        vm.assertTrue(featureManagerFacet.checkFeatureCondition(featureId, space));
    }

    function test_getFeatureConditionsForSpace(
        bytes32 featureId,
        FeatureCondition memory condition,
        address user,
        uint256 amount,
        address space
    ) external givenFeatureConditionIsSet(featureId, condition, user, amount) {
        vm.assume(user != address(0));
        vm.assume(space != address(0));
        vm.assume(user != space);
        vm.assume(condition.active == true);

        // get feature conditions for space
        FeatureCondition[] memory conditions = featureManagerFacet.getFeatureConditionsForSpace(
            space
        );

        // no conditions since we haven't delegated
        assertEq(conditions.length, 0);

        // delegate to space
        vm.prank(user);
        towns.delegate(space);

        // get feature conditions for space
        conditions = featureManagerFacet.getFeatureConditionsForSpace(space);
        assertEq(conditions.length, 1);

        // disable feature condition
        vm.prank(deployer);
        featureManagerFacet.disableFeatureCondition(featureId);

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
            token: address(townsToken),
            threshold: 0,
            active: true,
            extraData: ""
        });

        vm.prank(bridge);
        towns.mint(deployer, TEST_THRESHOLD);

        vm.prank(deployer);
        featureManagerFacet.setFeatureCondition(TEST_FEATURE_ID, condition);

        vm.assertTrue(featureManagerFacet.checkFeatureCondition(TEST_FEATURE_ID, space));
    }
}
