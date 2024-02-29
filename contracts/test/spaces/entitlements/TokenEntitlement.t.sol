// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IEntitlement, IEntitlementBase} from "contracts/src/spaces/entitlements/IEntitlement.sol";
import {ITokenEntitlement} from "contracts/src/spaces/entitlements/token/ITokenEntitlement.sol";

//libraries

//contracts
import {TokenEntitlement} from "contracts/src/spaces/entitlements/token/TokenEntitlement.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {MockERC721} from "contracts/test/mocks/MockERC721.sol";

contract TokenEntitlementTest is TestUtils, IEntitlementBase {
  TokenEntitlement internal implementation;
  TokenEntitlement internal tokenEntitlement;
  MockERC721 internal mockERC721;

  address internal entitlement;
  address internal town;
  address internal deployer;

  function setUp() public {
    deployer = _randomAddress();
    town = _randomAddress();

    vm.startPrank(deployer);
    mockERC721 = new MockERC721();
    implementation = new TokenEntitlement();
    entitlement = address(
      new ERC1967Proxy(
        address(implementation),
        abi.encodeCall(TokenEntitlement.initialize, (town))
      )
    );
    tokenEntitlement = TokenEntitlement(entitlement);
    vm.stopPrank();
  }

  function test_getEntitlementDataByRoleId(uint256 roleId) external {
    vm.assume(roleId != 0);

    address user = _randomAddress();

    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = mockERC721.mintTo(user);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(mockERC721),
      quantity: 1,
      isSingleToken: false,
      tokenIds: tokenIds
    });

    vm.startPrank(town);
    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens));

    bytes[] memory entitlementData = tokenEntitlement
      .getEntitlementDataByRoleId(roleId);

    for (uint256 i = 0; i < entitlementData.length; i++) {
      ITokenEntitlement.ExternalToken[] memory entitlementTokens = abi.decode(
        entitlementData[i],
        (ITokenEntitlement.ExternalToken[])
      );

      for (uint256 j = 0; j < entitlementTokens.length; j++) {
        ITokenEntitlement.ExternalToken memory token = entitlementTokens[j];
        assertEq(token.contractAddress, address(mockERC721));
      }
    }
  }

  function test_setEntitlement_revert_empty_tokens(uint256 roleId) external {
    vm.prank(town);
    vm.expectRevert(Entitlement__InvalidValue.selector);
    tokenEntitlement.setEntitlement(
      roleId,
      abi.encode(new ITokenEntitlement.ExternalToken[](0))
    );
  }

  function test_setEntitlement_revert_wrong_token_address(
    uint256 roleId
  ) external {
    vm.prank(town);
    vm.expectRevert(Entitlement__InvalidValue.selector);
    tokenEntitlement.setEntitlement(
      roleId,
      abi.encode(new ITokenEntitlement.ExternalToken[](1))
    );
  }

  function test_setEntitlement_revert_no_quantity(uint256 roleId) external {
    vm.assume(roleId != 0);

    address user = _randomAddress();

    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = mockERC721.mintTo(user);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(mockERC721),
      quantity: 0,
      isSingleToken: true,
      tokenIds: tokenIds
    });

    vm.prank(town);
    vm.expectRevert(Entitlement__InvalidValue.selector);
    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens));
  }

  function test_removeEntitlement(uint256 roleId) external {
    vm.assume(roleId != 0);

    address user = _randomAddress();

    ITokenEntitlement.ExternalToken[]
      memory tokens = new ITokenEntitlement.ExternalToken[](1);

    uint256[] memory tokenIds = new uint256[](1);
    tokenIds[0] = mockERC721.mintTo(user);

    tokens[0] = ITokenEntitlement.ExternalToken({
      contractAddress: address(mockERC721),
      quantity: 1,
      isSingleToken: true,
      tokenIds: tokenIds
    });

    vm.startPrank(town);
    tokenEntitlement.setEntitlement(roleId, abi.encode(tokens));
    tokenEntitlement.removeEntitlement(roleId, abi.encode(tokens));
    vm.stopPrank();
  }
}
