// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ISimpleApp {
    function initialize(
        address owner,
        string calldata appId,
        bytes32[] calldata permissions,
        uint256 installPrice,
        uint64 accessDuration
    ) external;
}
