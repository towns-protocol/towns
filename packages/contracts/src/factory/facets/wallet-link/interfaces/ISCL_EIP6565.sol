// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface ISCL_EIP6565 {
    function Verify(
        string memory m,
        uint256 r,
        uint256 s,
        uint256[5] memory extKpub
    ) external returns (bool flag);

    function Verify_LE(
        string memory m,
        uint256 r,
        uint256 s,
        uint256[5] memory extKpub
    ) external returns (bool flag);
}
