// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IDMGating} from "src/account/facets/dm/IDMGating.sol";
import {ICriteria} from "src/account/facets/dm/ICriteria.sol";

// libraries
import {DMGatingMod} from "src/account/facets/dm/DMGatingMod.sol";

// contracts
import {ERC6900Setup} from "./ERC6900Setup.sol";
import {DeployAccountModules} from "scripts/deployments/diamonds/DeployAccountModules.s.sol";
import {AllowlistCriteria} from "src/account/criteria/AllowlistCriteria.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";

contract DMGatingTest is ERC6900Setup {
    DeployAccountModules internal deployAccountModules;

    IDMGating internal dmGating;
    AllowlistCriteria internal allowlistCriteria;

    function setUp() public override {
        super.setUp();

        deployAccountModules = new DeployAccountModules();
        deployAccountModules.setDependencies(spaceFactory, appRegistry);
        address mod = deployAccountModules.deploy(deployer);

        dmGating = IDMGating(mod);
        allowlistCriteria = new AllowlistCriteria(mod);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  DEFAULT BEHAVIOR TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_canReceiveDMFrom_returnsFalse_whenNoCriteria(
        address user,
        address sender
    ) external {
        vm.assume(user != sender);
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        bool result = dmGating.canReceiveDMFrom(sender, "");

        assertFalse(result, "Should block all DMs by default");
    }

    function test_getInstalledCriteria_returnsEmpty_initially(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        address[] memory criteria = dmGating.getInstalledCriteria();

        assertEq(criteria.length, 0);
    }

    function test_getCombinationMode_returnsAND_initially(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        DMGatingMod.CombinationMode mode = dmGating.getCombinationMode();

        assertEq(uint8(mode), uint8(DMGatingMod.CombinationMode.AND));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  INSTALL CRITERIA TESTS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_installCriteria_success(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        vm.expectEmit(address(dmGating));
        emit DMGatingMod.CriteriaInstalled(address(account), address(allowlistCriteria));
        dmGating.installCriteria(address(allowlistCriteria), "");

        vm.prank(address(account));
        assertTrue(dmGating.isCriteriaInstalled(address(allowlistCriteria)));

        vm.prank(address(account));
        address[] memory criteria = dmGating.getInstalledCriteria();
        assertEq(criteria.length, 1);
        assertEq(criteria[0], address(allowlistCriteria));
    }

    function test_installCriteria_revertWhen_invalidCriteria(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        vm.expectRevert(DMGatingMod.DMGating__InvalidCriteria.selector);
        dmGating.installCriteria(address(0), "");
    }

    function test_installCriteria_revertWhen_alreadyInstalled(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), "");

        vm.prank(address(account));
        vm.expectRevert(DMGatingMod.DMGating__CriteriaAlreadyInstalled.selector);
        dmGating.installCriteria(address(allowlistCriteria), "");
    }

    function test_installCriteria_revertWhen_maxCriteriaReached(address user) external {
        ModularAccount account = _createAccount(user);

        // Install 8 criteria (max)
        for (uint8 i = 0; i < 8; i++) {
            AllowlistCriteria newCriteria = new AllowlistCriteria(address(dmGating));
            vm.prank(address(account));
            dmGating.installCriteria(address(newCriteria), "");
        }

        // 9th should fail
        AllowlistCriteria extraCriteria = new AllowlistCriteria(address(dmGating));
        vm.prank(address(account));
        vm.expectRevert(DMGatingMod.DMGating__MaxCriteriaReached.selector);
        dmGating.installCriteria(address(extraCriteria), "");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 UNINSTALL CRITERIA TESTS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_uninstallCriteria_success(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), "");

        vm.prank(address(account));
        vm.expectEmit(address(dmGating));
        emit DMGatingMod.CriteriaUninstalled(address(account), address(allowlistCriteria));
        dmGating.uninstallCriteria(address(allowlistCriteria));

        vm.prank(address(account));
        assertFalse(dmGating.isCriteriaInstalled(address(allowlistCriteria)));
    }

    function test_uninstallCriteria_revertWhen_notInstalled(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        vm.expectRevert(DMGatingMod.DMGating__CriteriaNotInstalled.selector);
        dmGating.uninstallCriteria(address(allowlistCriteria));
    }

    function test_uninstallCriteria_revertWhen_invalidCriteria(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        vm.expectRevert(DMGatingMod.DMGating__InvalidCriteria.selector);
        dmGating.uninstallCriteria(address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 COMBINATION MODE TESTS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_setCombinationMode_success(address user) external {
        ModularAccount account = _createAccount(user);

        vm.prank(address(account));
        vm.expectEmit(address(dmGating));
        emit DMGatingMod.CombinationModeChanged(address(account), DMGatingMod.CombinationMode.OR);
        dmGating.setCombinationMode(DMGatingMod.CombinationMode.OR);

        vm.prank(address(account));
        DMGatingMod.CombinationMode mode = dmGating.getCombinationMode();
        assertEq(uint8(mode), uint8(DMGatingMod.CombinationMode.OR));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    OR MODE TESTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_canReceiveDMFrom_ORMode_returnsTrue_whenAnyPass(
        address user,
        address sender
    ) external {
        vm.assume(user != sender);
        vm.assume(sender != address(0));
        ModularAccount account = _createAccount(user);

        // Install criteria with sender in allowlist
        address[] memory allowed = new address[](1);
        allowed[0] = sender;

        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), abi.encode(allowed));

        // Install another criteria that will fail
        AllowlistCriteria emptyAllowlist = new AllowlistCriteria(address(dmGating));
        vm.prank(address(account));
        dmGating.installCriteria(address(emptyAllowlist), "");

        // Set to OR mode
        vm.prank(address(account));
        dmGating.setCombinationMode(DMGatingMod.CombinationMode.OR);

        vm.prank(address(account));
        bool result = dmGating.canReceiveDMFrom(sender, "");

        assertTrue(result, "Should allow when any criteria passes in OR mode");
    }

    function test_canReceiveDMFrom_ORMode_returnsFalse_whenNonePass(
        address user,
        address sender
    ) external {
        vm.assume(user != sender);
        ModularAccount account = _createAccount(user);

        // Install criteria with empty allowlist
        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), "");

        // Set to OR mode
        vm.prank(address(account));
        dmGating.setCombinationMode(DMGatingMod.CombinationMode.OR);

        vm.prank(address(account));
        bool result = dmGating.canReceiveDMFrom(sender, "");

        assertFalse(result, "Should block when no criteria passes in OR mode");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    AND MODE TESTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_canReceiveDMFrom_ANDMode_returnsTrue_whenAllPass(
        address user,
        address sender
    ) external {
        vm.assume(user != sender);
        vm.assume(sender != address(0));
        ModularAccount account = _createAccount(user);

        // Install criteria with sender in allowlist
        address[] memory allowed = new address[](1);
        allowed[0] = sender;

        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), abi.encode(allowed));

        // Install another criteria with sender also in allowlist
        AllowlistCriteria secondAllowlist = new AllowlistCriteria(address(dmGating));
        vm.prank(address(account));
        dmGating.installCriteria(address(secondAllowlist), abi.encode(allowed));

        // Default is AND mode
        vm.prank(address(account));
        bool result = dmGating.canReceiveDMFrom(sender, "");

        assertTrue(result, "Should allow when all criteria pass in AND mode");
    }

    function test_canReceiveDMFrom_ANDMode_returnsFalse_whenAnyFails(
        address user,
        address sender
    ) external {
        vm.assume(user != sender);
        vm.assume(sender != address(0));
        ModularAccount account = _createAccount(user);

        // Install criteria with sender in allowlist
        address[] memory allowed = new address[](1);
        allowed[0] = sender;

        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), abi.encode(allowed));

        // Install another criteria with empty allowlist (will fail)
        AllowlistCriteria emptyAllowlist = new AllowlistCriteria(address(dmGating));
        vm.prank(address(account));
        dmGating.installCriteria(address(emptyAllowlist), "");

        // Default is AND mode
        vm.prank(address(account));
        bool result = dmGating.canReceiveDMFrom(sender, "");

        assertFalse(result, "Should block when any criteria fails in AND mode");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 ALLOWLIST INTEGRATION TESTS                 */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_allowlistCriteria_addAndRemove(address user, address sender) external {
        vm.assume(user != sender);
        vm.assume(sender != address(0));
        ModularAccount account = _createAccount(user);

        // Install empty allowlist
        vm.prank(address(account));
        dmGating.installCriteria(address(allowlistCriteria), "");

        // Set to OR mode for single criteria behavior
        vm.prank(address(account));
        dmGating.setCombinationMode(DMGatingMod.CombinationMode.OR);

        // Initially should be blocked
        vm.prank(address(account));
        assertFalse(dmGating.canReceiveDMFrom(sender, ""));

        // Add sender to allowlist
        address[] memory toAdd = new address[](1);
        toAdd[0] = sender;
        vm.prank(address(account));
        allowlistCriteria.addToAllowlist(toAdd);

        // Now should be allowed
        vm.prank(address(account));
        assertTrue(dmGating.canReceiveDMFrom(sender, ""));

        // Remove from allowlist
        vm.prank(address(account));
        allowlistCriteria.removeFromAllowlist(toAdd);

        // Should be blocked again
        vm.prank(address(account));
        assertFalse(dmGating.canReceiveDMFrom(sender, ""));
    }
}
