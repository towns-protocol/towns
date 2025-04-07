// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ITownsApp {
    function requiredPermissions() external view returns (bytes32[] memory);
}
