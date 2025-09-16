// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC721A} from "src/diamond/facets/token/ERC721A/IERC721A.sol";
import {IArchitect} from "src/factory/facets/architect/IArchitect.sol";
import {IGuardianBase} from "src/spaces/facets/guardian/IGuardian.sol";
import {IGuardian} from "src/spaces/facets/guardian/IGuardian.sol";

// libraries

// contracts
import {SimpleAccount} from "@eth-infinitism/account-abstraction/samples/SimpleAccount.sol";
import {BaseSetup} from "test/spaces/BaseSetup.sol";

contract GuardianTest is BaseSetup, IGuardianBase {
    IGuardian guardian;

    function setUp() public override {
        super.setUp();
        guardian = IGuardian(spaceOwner);
    }

    // guardian is enabled by default
    function test_isGuardianEnabled() external view {
        address wallet = _randomAddress();
        assertTrue(guardian.isGuardianEnabled(wallet));
    }

    function test_disableGuardian() external {
        address wallet = _randomAddress();

        vm.prank(wallet);
        guardian.disableGuardian();

        assertTrue(guardian.isGuardianEnabled(wallet));

        // wait for the cooldown to pass
        vm.warp(guardian.guardianCooldown(wallet));

        assertFalse(guardian.isGuardianEnabled(wallet));
    }

    function test_enableGuardian(address user) external {
        SimpleAccount account = _createSimpleAccount(user);
        address wallet = address(account);

        vm.prank(wallet);
        guardian.disableGuardian();

        // wait for the cooldown to pass
        vm.warp(guardian.guardianCooldown(wallet));

        assertFalse(guardian.isGuardianEnabled(wallet));

        vm.prank(wallet);
        guardian.enableGuardian();

        assertTrue(guardian.isGuardianEnabled(wallet));
    }

    function test_revert_disableGuardian_alreadyDisabled() external {
        address wallet = _randomAddress();

        vm.prank(wallet);
        guardian.disableGuardian();

        vm.prank(wallet);
        vm.expectRevert(Guardian_AlreadyDisabled.selector);
        guardian.disableGuardian();
    }

    function test_revert_enableGuardian_alreadyEnabled() external {
        address wallet = _randomAddress();

        vm.prank(wallet);
        vm.expectRevert(Guardian_AlreadyEnabled.selector);
        guardian.enableGuardian();
    }

    function test_disableGuardiandAndTransfer() external {
        address newFounder = _randomAddress();

        vm.prank(founder);
        guardian.disableGuardian();

        vm.warp(guardian.guardianCooldown(founder));

        uint256 tokenId = IArchitect(spaceFactory).getTokenIdBySpace(space);

        vm.prank(founder);
        IERC721A(spaceOwner).transferFrom(founder, newFounder, tokenId);

        assertTrue(guardian.isGuardianEnabled(newFounder));
    }
}
