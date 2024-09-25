// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {PolymarketEntitlement, IGnosisSafeProxyFactory} from "contracts/src/spaces/entitlements/PolymarketEntitlement.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract PolyMarketEntitlementTest is Test {
  PolymarketEntitlement entitlement;
  address user1;
  address user2;
  address proxy1;
  address proxy2;

  IERC1155 tokenContract;
  IGnosisSafeProxyFactory proxyFactory;

  function setUp() public {
    user1 = address(0x1001);
    user2 = address(0x1002);

    proxy1 = address(0x2001);
    proxy2 = address(0x2002);

    // Set the proxyFactory and mainnet token contract addresses
    proxyFactory = IGnosisSafeProxyFactory(
      address(0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b)
    );

    tokenContract = IERC1155(
      address(0x4D97DCd97eC945f40cF65F87097ACe5EA0476045)
    );

    // Mock the proxyFactory and tokenContract for testing
    entitlement = new PolymarketEntitlement();
  }

  function testSingleUserWithSufficientBalance() public {
    // Mock proxyFactory.computeProxyAddress
    vm.mockCall(
      address(proxyFactory),
      abi.encodeWithSelector(proxyFactory.computeProxyAddress.selector, user1),
      abi.encode(proxy1)
    );

    // Mock tokenContract.balanceOf for user1 and proxy1
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, user1, 1),
      abi.encode(10)
    );
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, proxy1, 1),
      abi.encode(5)
    );

    // Parameters: tokenId=1, requiredBalance=10, aggregate=false
    bytes memory paramData = abi.encode(1, 10, false);
    address[] memory users = new address[](1);
    users[0] = user1;

    // Logging before calling the function
    console.log("Calling isEntitled for single user with sufficient balance");
    console.log("User1:", user1);
    console.log("Proxy1:", proxy1);

    // Act
    bool entitled = entitlement.isEntitled(users, paramData);

    // Assert
    console.log("Entitled result:", entitled);
    assertTrue(entitled, "User should be entitled with sufficient balance");
  }

  function testMultipleUsersWithAggregation() public {
    // Mock proxyFactory.computeProxyAddress for user1 and user2
    vm.mockCall(
      address(proxyFactory),
      abi.encodeWithSelector(proxyFactory.computeProxyAddress.selector, user1),
      abi.encode(proxy1)
    );
    vm.mockCall(
      address(proxyFactory),
      abi.encodeWithSelector(proxyFactory.computeProxyAddress.selector, user2),
      abi.encode(proxy2)
    );

    // Mock tokenContract.balanceOf for user1, proxy1, user2, and proxy2
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, user1, 1),
      abi.encode(3)
    );
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, proxy1, 1),
      abi.encode(2)
    );
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, user2, 1),
      abi.encode(1)
    );
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, proxy2, 1),
      abi.encode(4)
    );

    // Parameters: tokenId=1, requiredBalance=10, aggregate=true
    bytes memory paramData = abi.encode(1, 10, true);
    address[] memory users = new address[](2);
    users[0] = user1;
    users[1] = user2;

    // Logging before calling the function
    console.log("Calling isEntitled for multiple users with aggregation");

    // Act
    bool entitled = entitlement.isEntitled(users, paramData);

    // Assert
    console.log("Entitled result:", entitled);
    assertTrue(
      entitled,
      "Users should be entitled with sufficient aggregate balance"
    );
  }

  function testSingleUserWithInsufficientBalance() public {
    // Mock proxyFactory.computeProxyAddress
    vm.mockCall(
      address(proxyFactory),
      abi.encodeWithSelector(proxyFactory.computeProxyAddress.selector, user1),
      abi.encode(proxy1)
    );

    // Mock tokenContract.balanceOf for user1 and proxy1
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, user1, 1),
      abi.encode(5)
    );
    vm.mockCall(
      address(tokenContract),
      abi.encodeWithSelector(tokenContract.balanceOf.selector, proxy1, 1),
      abi.encode(4)
    );

    // Parameters: tokenId=1, requiredBalance=10, aggregate=false
    bytes memory paramData = abi.encode(1, 10, false);
    address[] memory users = new address[](1);
    users[0] = user1;

    // Logging before calling the function
    console.log("Calling isEntitled for single user with insufficient balance");
    console.log("User1:", user1);
    console.log("Proxy1:", proxy1);

    // Act
    bool entitled = entitlement.isEntitled(users, paramData);

    // Assert
    console.log("Entitled result:", entitled);
    assertFalse(
      entitled,
      "User should not be entitled with insufficient balance"
    );
  }
}
