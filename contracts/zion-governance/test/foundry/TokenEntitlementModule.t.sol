// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {Zion} from "../../contracts/governance/Zion.sol";
import {CouncilNFT} from "../../contracts/council/CouncilNFT.sol";
import {UserGrantedEntitlementModule} from "../../contracts/spaces/entitlement_modules/UserGrantedEntitlementModule.sol";
import {TokenEntitlementModule} from "../../contracts/spaces/entitlement_modules/TokenEntitlementModule.sol";
import {SpaceStructs} from "../../contracts/spaces/SpaceStructs.sol";
import "murky/Merkle.sol";

contract TokenEntitlementModuleTest is Test {
    ZionSpaceManager internal zionSpaceManager;
    Zion internal zionToken;
    CouncilNFT internal councilNFT;
    UserGrantedEntitlementModule internal userGrantedEntitlementModule;
    TokenEntitlementModule internal tokenEntitlementModule;

    function setUp() public {
        zionToken = new Zion();

        address first = address(0x101);
        bytes32[] memory data = new bytes32[](4);

        data[0] = keccak256(abi.encodePacked(first, "1"));

        Merkle m = new Merkle();
        bytes32 root = m.getRoot(data);

        councilNFT = new CouncilNFT("Zion", "zion", "baseUri", root);
        councilNFT.startPublicMint();
        zionSpaceManager = new ZionSpaceManager();
        userGrantedEntitlementModule = new UserGrantedEntitlementModule(
            address(zionSpaceManager)
        );
        tokenEntitlementModule = new TokenEntitlementModule(
            address(zionSpaceManager)
        );
    }

    function createTestSpaceWithUserGrantedEntitlementModule(
        string memory spaceName
    ) private {
        address[] memory newEntitlementModuleAddresses = new address[](1);
        newEntitlementModuleAddresses[0] = address(
            userGrantedEntitlementModule
        );
        zionSpaceManager.createSpace(spaceName, newEntitlementModuleAddresses);
    }

    function transferZionToken(address _to, uint256 quantity) private {
        zionToken.transfer(_to, quantity);
    }

    function testERC20TokenEntitlement() public {
        console.log("starting test");
        assertTrue(true);

        //Create the space with the UserGrantedEntitlementModule
        string memory spaceName = "testspace";
        uint256 spaceID = 1;
        uint256 roomID = 0;
        createTestSpaceWithUserGrantedEntitlementModule(spaceName);

        //Add the entitlement module to the space
        zionSpaceManager.addEntitlementModuleAddress(
            spaceID,
            address(tokenEntitlementModule),
            "token"
        );

        //Verify the token entitlement module is added to the space
        address[] memory entitlementModuleAddresses = zionSpaceManager
            .getSpaceEntitlementModuleAddresses(spaceID);
        assertEq(entitlementModuleAddresses.length, 2);
        assertEq(
            entitlementModuleAddresses[1],
            address(tokenEntitlementModule)
        );

        address userAddress = address(
            0x1234567890123456789012345678901234567890
        );

        //Transfer the token to the user
        transferZionToken(userAddress, 100);

        //Add a token entitlement for holders of the zion token to be moderators
        address[] memory zionTokenAddressArr = new address[](1);
        zionTokenAddressArr[0] = address(zionToken);

        uint256[] memory quantityArr = new uint256[](1);
        quantityArr[0] = 10;

        SpaceStructs.EntitlementType[]
            memory entitlementTypes = new SpaceStructs.EntitlementType[](1);
        entitlementTypes[0] = SpaceStructs.EntitlementType.Moderator;

        tokenEntitlementModule.addTokenEntitlements(
            spaceID,
            roomID,
            "ziontoken",
            zionTokenAddressArr,
            quantityArr,
            entitlementTypes
        );

        //Verify the user is entitled as a moderator to the space
        SpaceStructs.EntitlementType entitlementType = SpaceStructs
            .EntitlementType
            .Moderator;

        bool isEntitled = zionSpaceManager.isEntitled(
            spaceID,
            roomID,
            entitlementType,
            userAddress
        );

        assertEq(isEntitled, true);

        //Verify that a random address is not entitled to the token entitlement
        address randomAddress = address(
            0x9153F17C52f769Da46C1e85c1A93FCB23D427660
        );

        bool isRandomEntitled = zionSpaceManager.isEntitled(
            spaceID,
            roomID,
            entitlementType,
            randomAddress
        );
        assertEq(isRandomEntitled, false);
    }

    function testERC721TokenEntitlement() public {
        console.log("starting test");
        assertTrue(true);

        //Create the space with the UserGrantedEntitlementModule
        string memory spaceName = "testspace";
        uint256 spaceID = 1;
        uint256 roomID = 0;
        createTestSpaceWithUserGrantedEntitlementModule(spaceName);

        //Add the entitlement module to the space
        zionSpaceManager.addEntitlementModuleAddress(
            spaceID,
            address(tokenEntitlementModule),
            "token"
        );

        //Verify the token entitlement module is added to the space
        address[] memory entitlementModuleAddresses = zionSpaceManager
            .getSpaceEntitlementModuleAddresses(spaceID);
        assertEq(entitlementModuleAddresses.length, 2);
        assertEq(
            entitlementModuleAddresses[1],
            address(tokenEntitlementModule)
        );

        address userAddress = address(
            0x1234567890123456789012345678901234567890
        );

        //Transfer the token to the user
        councilNFT.mint{value: 0.08 ether}(userAddress);

        //Add a token entitlement for holders of the zion council nft to be moderators
        address[] memory councilNftArr = new address[](1);
        councilNftArr[0] = address(councilNFT);

        uint256[] memory quantityArr = new uint256[](1);
        quantityArr[0] = 1;

        SpaceStructs.EntitlementType[]
            memory entitlementTypes = new SpaceStructs.EntitlementType[](1);
        entitlementTypes[0] = SpaceStructs.EntitlementType.Moderator;

        tokenEntitlementModule.addTokenEntitlements(
            spaceID,
            roomID,
            "councilnft",
            councilNftArr,
            quantityArr,
            entitlementTypes
        );

        //Verify the user is entitled as a moderator to the space
        SpaceStructs.EntitlementType entitlementType = SpaceStructs
            .EntitlementType
            .Moderator;

        bool isEntitled = zionSpaceManager.isEntitled(
            spaceID,
            roomID,
            entitlementType,
            userAddress
        );

        assertEq(isEntitled, true);

        //Verify that a random address is not entitled to the token entitlement
        address randomAddress = address(
            0x9153F17C52f769Da46C1e85c1A93FCB23D427660
        );

        bool isRandomEntitled = zionSpaceManager.isEntitled(
            spaceID,
            roomID,
            entitlementType,
            randomAddress
        );
        assertEq(isRandomEntitled, false);
    }
}
