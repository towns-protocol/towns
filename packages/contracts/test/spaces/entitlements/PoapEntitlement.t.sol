// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces
import {IEntitlementBase} from "src/spaces/entitlements/IEntitlement.sol";

// libraries

// contracts
import {IPOAP, PoapEntitlement} from "src/spaces/entitlements/poap/PoapEntitlement.sol";

contract PoapEntitlementTest is TestUtils, IEntitlementBase {
    PoapEntitlement internal poapEntitlement;

    function setUp() public {
        poapEntitlement = new PoapEntitlement(address(new MockPoap()));
    }

    function test_isEntitled() external view {
        address[] memory users = new address[](1);
        users[0] = _randomAddress();

        assertTrue(poapEntitlement.isEntitled(users, abi.encode(28)));
    }
}

contract MockPoap is IPOAP {
    function balanceOf(address) external pure returns (uint256) {
        return 1;
    }

    function tokenDetailsOfOwnerByIndex(
        address,
        uint256
    ) external pure returns (uint256 eventId, uint256 tokenId) {
        return (28, 1);
    }
}
