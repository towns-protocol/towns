// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {ITownsBase} from "src/tokens/towns/mainnet/ITowns.sol";

// libraries

import {TokenInflationLib} from "src/tokens/towns/mainnet/libs/TokenInflationLib.sol";
import {BasisPoints} from "src/utils/libraries/BasisPoints.sol";

// contracts

import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";
import {DeployTownsMainnet} from "scripts/deployments/utils/DeployTownsMainnet.s.sol";
import {Towns} from "src/tokens/towns/mainnet/Towns.sol";

contract TownsMainnetTests is TestUtils, ITownsBase, EIP712Utils {
    DeployTownsMainnet internal deployTownsMainnet = new DeployTownsMainnet();

    /// @dev initial supply is 10 billion tokens
    uint256 internal INITIAL_SUPPLY = 10_000_000_000 ether;

    uint256 internal INITIAL_MINT_TIME = 1_709_667_671; // Tuesday, March 5, 2024 7:41:11 PM

    address internal vault;
    address internal manager;

    Towns towns;

    function setUp() external {
        towns = Towns(deployTownsMainnet.deploy());
        vault = deployTownsMainnet.vault();
        manager = deployTownsMainnet.manager();

        TokenInflationLib.initialize(deployTownsMainnet.inflationConfig(manager));

        vm.warp(INITIAL_MINT_TIME);
    }

    modifier givenMintedInitialSupply() {
        vm.prank(vault);
        towns.mintInitialSupply(vault);
        _;
    }

    modifier givenCallerHasTokens(address caller, uint256 amount) {
        vm.assume(caller != address(0));
        vm.assume(caller != ZERO_SENTINEL);

        amount = bound(amount, 1, INITIAL_SUPPLY);
        vm.prank(vault);
        towns.transfer(caller, amount);
        _;
    }

    modifier givenCallerHasDelegated(address caller, address delegatee) {
        vm.assume(caller != address(0));
        vm.assume(delegatee != address(0));
        vm.assume(caller != delegatee);
        vm.assume(towns.delegates(caller) == address(0));
        vm.assume(delegatee != ZERO_SENTINEL);
        vm.assume(caller != ZERO_SENTINEL);

        vm.prank(caller);
        towns.delegate(delegatee);
        assertEq(towns.delegates(caller), delegatee);
        _;
    }

    function test_init() external givenMintedInitialSupply {
        assertEq(towns.name(), "Towns");
        assertEq(towns.symbol(), "TOWNS");
        assertEq(towns.decimals(), 18);
        assertEq(towns.inflationReceiver(), vault);
        assertEq(towns.totalSupply(), INITIAL_SUPPLY);
        assertTrue(towns.supportsInterface(type(IERC20).interfaceId));
        assertTrue(towns.supportsInterface(type(IERC20Metadata).interfaceId));
    }
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       INITIAL SUPPLY                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_mintInitialSupply(address to) external {
        vm.assume(to != address(0));
        vm.assume(to != ZERO_SENTINEL);

        vm.prank(vault);
        towns.mintInitialSupply(to);
        assertEq(towns.totalSupply(), INITIAL_SUPPLY);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Permit                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_permit(
        address alice,
        address bob,
        uint256 amount
    ) external givenMintedInitialSupply givenCallerHasTokens(alice, amount) {
        vm.assume(bob != address(0));
        vm.assume(bob != ZERO_SENTINEL);
        vm.assume(alice != bob);

        vm.assume(towns.allowance(alice, bob) == 0);

        vm.prank(alice);
        towns.approve(bob, amount);
        assertEq(towns.allowance(alice, bob), amount);
    }

    function test_permit_withSignature(
        uint256 alicePrivateKey,
        address bob,
        uint256 amount
    ) external givenMintedInitialSupply {
        vm.assume(bob != address(0));
        vm.assume(bob != ZERO_SENTINEL);
        amount = bound(amount, 1, INITIAL_SUPPLY);
        alicePrivateKey = boundPrivateKey(alicePrivateKey);

        address alice = vm.addr(alicePrivateKey);
        vm.assume(towns.allowance(alice, bob) == 0);

        vm.assume(alice != bob);

        vm.prank(vault);
        towns.transfer(alice, amount);

        uint256 deadline = block.timestamp + 1 days;

        (uint8 v, bytes32 r, bytes32 s) = signPermit(
            alicePrivateKey,
            address(towns),
            alice,
            bob,
            amount,
            deadline
        );

        vm.prank(bob);
        towns.permit(alice, bob, amount, deadline, v, r, s);

        assertEq(towns.allowance(alice, bob), amount);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Inflation                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_createInflation() external givenMintedInitialSupply {
        // wait 1 year
        skip(365 days);

        uint256 inflationRateBPS = towns.currentInflationRate();
        assertEq(inflationRateBPS, TokenInflationLib.getCurrentInflationRateBPS(INITIAL_MINT_TIME));

        uint256 inflationAmount = BasisPoints.calculate(towns.totalSupply(), inflationRateBPS);

        vm.prank(vault);
        towns.createInflation();

        uint256 totalMinted = INITIAL_SUPPLY + inflationAmount;

        assertEq(towns.totalSupply(), totalMinted);
        assertEq(towns.lastMintTime(), block.timestamp);
        assertEq(towns.balanceOf(vault), totalMinted);
    }

    function test_createInflation_multipleTimes(uint256 times) external givenMintedInitialSupply {
        times = bound(times, 1, 20);

        for (uint256 i = 0; i < times; ++i) {
            vm.warp(towns.lastMintTime() + 365 days);
            uint256 inflationRateBPS = towns.currentInflationRate();
            uint256 totalSupply = towns.totalSupply();
            uint256 inflationAmount = BasisPoints.calculate(totalSupply, inflationRateBPS);

            assertEq(
                inflationRateBPS,
                TokenInflationLib.getCurrentInflationRateBPS(INITIAL_MINT_TIME)
            );

            uint256 totalMinted = totalSupply + inflationAmount;

            vm.prank(vault);
            towns.createInflation();
            assertEq(towns.totalSupply(), totalMinted);
            assertEq(towns.balanceOf(vault), totalMinted);
        }
    }

    function test_revertWhen_createInflation_mintingTooSoon() external givenMintedInitialSupply {
        vm.prank(vault);
        vm.expectRevert(MintingTooSoon.selector);
        towns.createInflation();
    }

    function test_currentInflationRate() external givenMintedInitialSupply {
        uint256 currentInflationRate = towns.currentInflationRate();
        assertEq(
            currentInflationRate,
            TokenInflationLib.getCurrentInflationRateBPS(INITIAL_MINT_TIME)
        );

        // wait 2 years
        skip(2 * 365 days);
        currentInflationRate = towns.currentInflationRate();
        assertEq(
            currentInflationRate,
            TokenInflationLib.getCurrentInflationRateBPS(INITIAL_MINT_TIME)
        );

        // wait 10 years
        skip(10 * 365 days);
        currentInflationRate = towns.currentInflationRate();
        assertEq(
            currentInflationRate,
            TokenInflationLib.getCurrentInflationRateBPS(INITIAL_MINT_TIME)
        );

        // wait 20 years
        skip(20 * 365 days);
        currentInflationRate = towns.currentInflationRate();
        assertEq(
            currentInflationRate,
            TokenInflationLib.getCurrentInflationRateBPS(INITIAL_MINT_TIME)
        );
    }

    function test_setOverrideInflation() external givenMintedInitialSupply {
        vm.prank(manager);
        towns.setOverrideInflation(true, 100);

        assertEq(towns.currentInflationRate(), 100);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Delegators                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/
    function test_getDelegators(
        address alice,
        address bob,
        uint256 tokens
    )
        external
        givenMintedInitialSupply
        givenCallerHasTokens(alice, tokens)
        givenCallerHasDelegated(alice, bob)
    {
        address[] memory delegators = towns.getDelegators();
        assertEq(delegators.length, 1);
        assertEq(delegators[0], alice);

        assertEq(towns.delegates(alice), bob);
    }

    function test_getDelegators_whenZeroDelegatorsAfterDelegating(
        address alice,
        address bob,
        uint256 tokens
    )
        external
        givenMintedInitialSupply
        givenCallerHasTokens(alice, tokens)
        givenCallerHasDelegated(alice, bob)
    {
        vm.prank(alice);
        towns.delegate(address(0));

        address[] memory delegators = towns.getDelegators();
        assertEq(delegators.length, 0);
    }

    function test_getDelegatorsByDelegatee(
        address alice,
        address bob,
        address charlie
    )
        external
        givenMintedInitialSupply
        givenCallerHasTokens(alice, 1000)
        givenCallerHasTokens(bob, 1000)
        givenCallerHasDelegated(alice, charlie)
        givenCallerHasDelegated(bob, charlie)
    {
        address[] memory delegators = towns.getDelegatorsByDelegatee(charlie);
        assertEq(delegators.length, 2);
        assertEq(delegators[0], alice);
        assertEq(delegators[1], bob);
    }

    struct TestPaginatedDelegators {
        address holder;
        address delegatee;
        uint256 tokenAmount;
    }

    function test_getPaginatedDelegators(
        TestPaginatedDelegators[10] memory test
    ) external givenMintedInitialSupply {
        for (uint256 i = 0; i < test.length; ++i) {
            test[i].tokenAmount = bound(test[i].tokenAmount, 1, 100);
            vm.assume(test[i].holder != test[i].delegatee);
            vm.assume(test[i].holder != ZERO_SENTINEL);
            vm.assume(test[i].delegatee != ZERO_SENTINEL);
            vm.assume(test[i].holder != address(0));
            vm.assume(test[i].delegatee != address(0));
            vm.assume(towns.delegates(test[i].holder) == address(0));

            vm.prank(vault);
            towns.transfer(test[i].holder, test[i].tokenAmount);

            vm.prank(test[i].holder);
            towns.delegate(test[i].delegatee);
        }

        uint256 delegatorsCount = towns.getDelegatorsCount();
        assertEq(delegatorsCount, test.length);

        (address[] memory delegators, uint256 next) = towns.getPaginatedDelegators(0, 5);
        assertEq(delegators.length, 5);
        assertEq(next, 5);

        (delegators, next) = towns.getPaginatedDelegators(5, 5);
        assertEq(delegators.length, 5);
        assertEq(next, 0);
    }

    function test_getPaginatedDelegators_whenNoMoreDelegators() external givenMintedInitialSupply {
        (address[] memory delegators, uint256 next) = towns.getPaginatedDelegators(0, 10);
        assertEq(delegators.length, 0);
        assertEq(next, 0);
    }
}
