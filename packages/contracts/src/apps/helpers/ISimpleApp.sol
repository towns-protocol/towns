// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ISimpleApp {
    function initialize(address owner, string memory appId, bytes32[] memory permissions) external;
}
