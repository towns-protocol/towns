// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDiamond} from "@towns-protocol/diamond/src/Diamond.sol";
import {IOwnableBase} from "@towns-protocol/diamond/src/facets/ownable/IERC173.sol";
import {ITownsPointsBase} from "src/airdrop/points/ITownsPoints.sol";

// libraries
import {CheckIn} from "src/airdrop/points/CheckIn.sol";

// contracts

import {BaseRegistryTest} from "../base/registry/BaseRegistry.t.sol";
import {TownsPoints} from "src/airdrop/points/TownsPoints.sol";

contract TownsPointsTest is BaseRegistryTest, IOwnableBase, IDiamond, ITownsPointsBase {
    TownsPoints internal pointsFacet;

    function setUp() public override {
        super.setUp();
        pointsFacet = TownsPoints(riverAirdrop);
    }

    function test_approve_reverts() public {
        vm.expectRevert(IDiamond.Diamond_UnsupportedFunction.selector);
        pointsFacet.approve(_randomAddress(), 1 ether);
    }

    function test_transfer_reverts() public {
        vm.expectRevert(IDiamond.Diamond_UnsupportedFunction.selector);
        pointsFacet.transfer(_randomAddress(), 1 ether);
    }

    function test_transferFrom_reverts() public {
        vm.expectRevert(IDiamond.Diamond_UnsupportedFunction.selector);
        pointsFacet.transferFrom(_randomAddress(), address(this), 1 ether);
    }

    function test_mint_revertIf_invalidSpace() public {
        vm.expectRevert(TownsPoints__InvalidSpace.selector);
        pointsFacet.mint(_randomAddress(), 1 ether);
    }

    function test_fuzz_mint(address to, uint256 value) public {
        vm.assume(to != address(0));

        vm.expectEmit(address(pointsFacet));
        emit IERC20.Transfer(address(0), to, value);

        vm.prank(space);
        pointsFacet.mint(to, value);
    }

    function test_batchMintPoints_revertIf_invalidArrayLength() public {
        vm.prank(deployer);
        vm.expectRevert(TownsPoints__InvalidArrayLength.selector);
        pointsFacet.batchMintPoints(abi.encode(new address[](1), new uint256[](2)));
    }

    function test_batchMintPoints_revertIf_notOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable__NotOwner.selector, address(this)));
        pointsFacet.batchMintPoints(abi.encode(new address[](1), new uint256[](1)));
    }

    function test_fuzz_batchMintPoints(
        address[32] memory accounts,
        uint256[32] memory values
    ) public {
        for (uint256 i; i < accounts.length; ++i) {
            if (accounts[i] == address(0)) {
                accounts[i] = _randomAddress();
            }
        }

        sanitizeAmounts(values);
        address[] memory _accounts = toDyn(accounts);
        uint256[] memory _values = toDyn(values);

        for (uint256 i = 0; i < _accounts.length; i++) {
            vm.expectEmit(address(pointsFacet));
            emit IERC20.Transfer(address(0), _accounts[i], _values[i]);
        }

        vm.prank(deployer);
        pointsFacet.batchMintPoints(abi.encode(_accounts, _values));
    }

    modifier givenCheckedIn(address user) {
        vm.assume(user != address(0));

        vm.expectEmit(address(pointsFacet));
        emit IERC20.Transfer(address(0), user, 1 ether);

        vm.prank(user);
        pointsFacet.checkIn();
        _;
    }

    modifier givenUserCheckInAfterMaxStreak(address user) {
        vm.assume(user != address(0));
        uint256 currentTime = block.timestamp;
        for (uint256 i; i < CheckIn.MAX_STREAK_PER_CHECKIN; ++i) {
            vm.warp(currentTime + CheckIn.CHECK_IN_WAIT_PERIOD + 1);
            vm.prank(user);
            pointsFacet.checkIn();
            currentTime = block.timestamp;
        }
        _;
    }

    function test_checkInFirstTime(address user) external givenCheckedIn(user) {
        assertEq(pointsFacet.balanceOf(user), 1 ether);
        assertEq(pointsFacet.getCurrentStreak(user), 1);
        assertEq(pointsFacet.getLastCheckIn(user), block.timestamp);
    }

    function test_checkIn_revertIf_checkInPeriodNotPassed(
        address user
    ) external givenCheckedIn(user) {
        vm.prank(user);
        vm.expectRevert(TownsPoints__CheckInPeriodNotPassed.selector);
        pointsFacet.checkIn();
    }

    function test_checkIn_afterTimePeriodPassed(address user) external givenCheckedIn(user) {
        vm.warp(block.timestamp + CheckIn.CHECK_IN_WAIT_PERIOD + 1);

        uint256 currentStreak = pointsFacet.getCurrentStreak(user);
        uint256 currentPoints = pointsFacet.balanceOf(user);
        (uint256 pointsToAward, uint256 newStreak) = CheckIn.getPointsAndStreak(
            pointsFacet.getLastCheckIn(user),
            currentStreak,
            block.timestamp
        );

        vm.expectEmit(address(pointsFacet));
        emit IERC20.Transfer(address(0), user, pointsToAward);

        vm.prank(user);
        pointsFacet.checkIn();

        assertEq(pointsFacet.balanceOf(user), currentPoints + pointsToAward);
        assertEq(pointsFacet.getCurrentStreak(user), newStreak);
    }

    function test_checkIn_afterMaxStreak(
        address user
    ) external givenUserCheckInAfterMaxStreak(user) {
        uint256 currentPoints = pointsFacet.balanceOf(user);

        vm.warp(block.timestamp + CheckIn.CHECK_IN_WAIT_PERIOD + 1);

        vm.expectEmit(address(pointsFacet));
        emit IERC20.Transfer(address(0), user, CheckIn.MAX_POINTS_PER_CHECKIN);

        vm.prank(user);
        pointsFacet.checkIn();

        assertEq(pointsFacet.balanceOf(user), currentPoints + CheckIn.MAX_POINTS_PER_CHECKIN);
    }
}
