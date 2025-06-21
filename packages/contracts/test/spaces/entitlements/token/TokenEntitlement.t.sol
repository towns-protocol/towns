// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {TokenEntitlement} from "src/spaces/entitlements/token/TokenEntitlement.sol";
import {ITokenEntitlement} from "src/spaces/entitlements/token/ITokenEntitlement.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";
import {MockERC721} from "test/mocks/MockERC721.sol";
import {MockERC1155} from "test/mocks/MockERC1155.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract TokenEntitlementTest is Test {
    TokenEntitlement public implementation;
    TokenEntitlement public tokenEntitlement;

    MockERC20 public mockERC20;
    MockERC721 public mockERC721;
    MockERC1155 public mockERC1155;

    address public space = address(0x1234);
    address public alice = address(0xABCD);
    address public bob = address(0xDEAD);

    uint256 public constant ROLE_ID = 1;
    uint256 public constant ERC1155_TOKEN_ID = 42;

    event EntitlementSet(uint256 indexed roleId, address indexed grantedBy);
    event EntitlementRemoved(uint256 indexed roleId);

    function setUp() public {
        // Deploy mock tokens
        mockERC20 = new MockERC20("Test Token", "TEST");
        mockERC721 = new MockERC721();
        mockERC1155 = new MockERC1155();

        // Deploy implementation
        implementation = new TokenEntitlement();

        // Deploy proxy
        bytes memory initData = abi.encodeCall(TokenEntitlement.initialize, (space));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tokenEntitlement = TokenEntitlement(address(proxy));
    }

    function testInitialize() public {
        assertEq(tokenEntitlement.SPACE_ADDRESS(), space);
        assertEq(tokenEntitlement.name(), "Token Entitlement");
        assertEq(tokenEntitlement.description(), "Entitlement for same-chain token balance checks");
        assertEq(tokenEntitlement.moduleType(), "TokenEntitlement");
        assertFalse(tokenEntitlement.isCrosschain());
    }

    function testSetEntitlementERC20() public {
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC20,
            contractAddress: address(mockERC20),
            threshold: 100 ether,
            tokenId: 0
        });

        bytes memory encodedData = abi.encode(tokenData);

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, encodedData);

        ITokenEntitlement.TokenData memory storedData = tokenEntitlement.getTokenData(ROLE_ID);
        assertEq(uint8(storedData.tokenType), uint8(ITokenEntitlement.TokenType.ERC20));
        assertEq(storedData.contractAddress, address(mockERC20));
        assertEq(storedData.threshold, 100 ether);
        assertEq(storedData.tokenId, 0);
    }

    function testSetEntitlementERC721() public {
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC721,
            contractAddress: address(mockERC721),
            threshold: 2, // Must own at least 2 NFTs
            tokenId: 0
        });

        bytes memory encodedData = abi.encode(tokenData);

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, encodedData);

        ITokenEntitlement.TokenData memory storedData = tokenEntitlement.getTokenData(ROLE_ID);
        assertEq(uint8(storedData.tokenType), uint8(ITokenEntitlement.TokenType.ERC721));
        assertEq(storedData.contractAddress, address(mockERC721));
        assertEq(storedData.threshold, 2);
    }

    function testSetEntitlementERC1155() public {
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC1155,
            contractAddress: address(mockERC1155),
            threshold: 5,
            tokenId: ERC1155_TOKEN_ID
        });

        bytes memory encodedData = abi.encode(tokenData);

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, encodedData);

        ITokenEntitlement.TokenData memory storedData = tokenEntitlement.getTokenData(ROLE_ID);
        assertEq(uint8(storedData.tokenType), uint8(ITokenEntitlement.TokenType.ERC1155));
        assertEq(storedData.contractAddress, address(mockERC1155));
        assertEq(storedData.threshold, 5);
        assertEq(storedData.tokenId, ERC1155_TOKEN_ID);
    }

    function testSetEntitlementNative() public {
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.NATIVE,
            contractAddress: address(0),
            threshold: 1 ether,
            tokenId: 0
        });

        bytes memory encodedData = abi.encode(tokenData);

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, encodedData);

        ITokenEntitlement.TokenData memory storedData = tokenEntitlement.getTokenData(ROLE_ID);
        assertEq(uint8(storedData.tokenType), uint8(ITokenEntitlement.TokenType.NATIVE));
        assertEq(storedData.contractAddress, address(0));
        assertEq(storedData.threshold, 1 ether);
    }

    function testIsEntitledERC20() public {
        // Setup ERC20 entitlement
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC20,
            contractAddress: address(mockERC20),
            threshold: 100 ether,
            tokenId: 0
        });

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));

        // Alice has no tokens - should not be entitled
        address[] memory users = new address[](1);
        users[0] = alice;
        assertFalse(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));

        // Give Alice tokens
        mockERC20.mint(alice, 100 ether);

        // Now Alice should be entitled
        assertTrue(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));

        // Test with multiple users where one is entitled
        address[] memory multiUsers = new address[](2);
        multiUsers[0] = bob; // Bob has no tokens
        multiUsers[1] = alice; // Alice has tokens
        assertTrue(tokenEntitlement.isEntitled(bytes32(0), multiUsers, bytes32(0)));
    }

    function testIsEntitledERC721() public {
        // Setup ERC721 entitlement
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC721,
            contractAddress: address(mockERC721),
            threshold: 2,
            tokenId: 0
        });

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));

        address[] memory users = new address[](1);
        users[0] = alice;

        // Alice has no NFTs - should not be entitled
        assertFalse(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));

        // Give Alice 1 NFT - still not enough
        mockERC721.mintTo(alice);
        assertFalse(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));

        // Give Alice another NFT - now she has 2
        mockERC721.mintTo(alice);
        assertTrue(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));
    }

    function testIsEntitledERC1155() public {
        // Setup ERC1155 entitlement
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC1155,
            contractAddress: address(mockERC1155),
            threshold: 5,
            tokenId: ERC1155_TOKEN_ID
        });

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));

        address[] memory users = new address[](1);
        users[0] = alice;

        // Alice has no tokens - should not be entitled
        assertFalse(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));

        // Give Alice tokens
        mockERC1155.safeMint(alice, ERC1155_TOKEN_ID, 5);

        // Now Alice should be entitled
        assertTrue(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));
    }

    function testIsEntitledNative() public {
        // Setup native token entitlement
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.NATIVE,
            contractAddress: address(0),
            threshold: 1 ether,
            tokenId: 0
        });

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));

        address[] memory users = new address[](1);
        users[0] = alice;

        // Alice has no ETH - should not be entitled
        assertFalse(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));

        // Give Alice ETH
        vm.deal(alice, 1 ether);

        // Now Alice should be entitled
        assertTrue(tokenEntitlement.isEntitled(bytes32(0), users, bytes32(0)));
    }

    function testRemoveEntitlement() public {
        // First set an entitlement
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC20,
            contractAddress: address(mockERC20),
            threshold: 100 ether,
            tokenId: 0
        });

        vm.prank(space);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));

        // Verify it was set
        bytes memory data = tokenEntitlement.getEntitlementDataByRoleId(ROLE_ID);
        assertTrue(data.length > 0);

        // Remove it
        vm.prank(space);
        tokenEntitlement.removeEntitlement(ROLE_ID);

        // Verify it was removed
        data = tokenEntitlement.getEntitlementDataByRoleId(ROLE_ID);
        assertEq(data.length, 0);
    }

    function testOnlySpaceCanSetEntitlement() public {
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC20,
            contractAddress: address(mockERC20),
            threshold: 100 ether,
            tokenId: 0
        });

        bytes memory encodedData = abi.encode(tokenData);

        vm.prank(alice);
        vm.expectRevert(ITokenEntitlement.TokenEntitlement__NotAllowed.selector);
        tokenEntitlement.setEntitlement(ROLE_ID, encodedData);
    }

    function testInvalidTokenData() public {
        // Test empty data
        vm.prank(space);
        vm.expectRevert(ITokenEntitlement.TokenEntitlement__InvalidTokenData.selector);
        tokenEntitlement.setEntitlement(ROLE_ID, "");

        // Test zero threshold
        ITokenEntitlement.TokenData memory tokenData = ITokenEntitlement.TokenData({
            tokenType: ITokenEntitlement.TokenType.ERC20,
            contractAddress: address(mockERC20),
            threshold: 0,
            tokenId: 0
        });

        vm.prank(space);
        vm.expectRevert(ITokenEntitlement.TokenEntitlement__InvalidTokenData.selector);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));

        // Test zero address for non-native token
        tokenData.contractAddress = address(0);
        tokenData.threshold = 100;

        vm.prank(space);
        vm.expectRevert(ITokenEntitlement.TokenEntitlement__InvalidTokenData.selector);
        tokenEntitlement.setEntitlement(ROLE_ID, abi.encode(tokenData));
    }

    function testRemoveNonExistentEntitlement() public {
        vm.prank(space);
        vm.expectRevert(ITokenEntitlement.TokenEntitlement__InvalidTokenData.selector);
        tokenEntitlement.removeEntitlement(999);
    }
}
