// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {Towns} from "src/tokens/towns/mainnet/Towns.sol";

// debuggging
import {console} from "forge-std/console.sol";
contract ForkTownsInflation is TestUtils {
    Towns internal towns;

    address internal vault = 0x23b168657744124360d3553F3bc257f3E28cBaf9;
    address internal manager = 0x18038ee5692FCE1cc0B0b3F2D63e09639A597F94;

    function setUp() public {
        vm.createSelectFork("mainnet");
        towns = Towns(0x000000Fa00b200406de700041CFc6b19BbFB4d13);
    }

    function test_createInflation() public {
        // Get initial state
        uint256 initialSupply = towns.totalSupply();
        console.log("\nInitial token supply:", initialSupply / 1e18, "TOWNS");

        uint256 lastMintTime = towns.lastMintTime();
        console.log("Last mint time:", lastMintTime);

        // Simulate 20 years of inflation
        for (uint256 i = 0; i < 20; i++) {
            // Warp to next mint time
            vm.warp(lastMintTime + 365 days);

            // Get current state before minting
            uint256 currentSupply = towns.totalSupply();
            uint256 currentInflationRate = towns.currentInflationRate();

            // Calculate expected inflation
            uint256 expectedInflation = (currentSupply * currentInflationRate) / 10000;

            // Create inflation
            vm.prank(vault);
            towns.createInflation();

            // Get new supply after minting
            uint256 newSupply = towns.totalSupply();
            uint256 actualInflation = newSupply - currentSupply;

            // Log results
            console.log("\nYear", i + 2, "Inflation:");
            console.log("  Current supply before:", currentSupply / 1e18, "TOWNS");
            console.log("  Inflation rate:", currentInflationRate, "basis points");
            console.log("  Expected inflation:", expectedInflation / 1e18, "TOWNS");
            console.log("  Actual inflation:", actualInflation / 1e18, "TOWNS");
            console.log("  New supply after:", newSupply / 1e18, "TOWNS");

            // Update last mint time for next iteration
            lastMintTime = towns.lastMintTime();
        }
    }
}
