// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "../../contracts/spaces/entitlement_modules/UserGrantedEntitlementModule.sol";
import {SpaceStructs} from "../../contracts/spaces/SpaceStructs.sol";

contract ZionSpaceManagerTest is Test {
    ZionSpaceManager internal zionSpaceManager;
    UserGrantedEntitlementModule internal userGrantedEntitlementModule;

    function setUp() public {
        zionSpaceManager = new ZionSpaceManager();
        userGrantedEntitlementModule = new UserGrantedEntitlementModule(
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

    function testCreateSpace() public {
        //Create the space with the UserGrantedEntitlementModule
        string memory spaceName = "testspace";
        uint256 spaceID = 1;
        createTestSpaceWithUserGrantedEntitlementModule(spaceName);

        //Verify space infomration is correct
        ZionSpaceManager.SpaceNameID[] memory spaceNameIDs = zionSpaceManager
            .getSpaceNames();
        assertEq(spaceNameIDs.length, 1);
        assertEq(spaceNameIDs[0].name, spaceName);
        assertEq(spaceNameIDs[0].id, spaceID);

        //Verify the user granted entitlement module is added to the space
        address[] memory entitlementModuleAddresses = zionSpaceManager
            .getSpaceEntitlementModuleAddresses(spaceID);
        assertEq(entitlementModuleAddresses.length, 1);
        assertEq(
            entitlementModuleAddresses[0],
            address(userGrantedEntitlementModule)
        );
    }

    function testCreatorIsSpaceOwner() public {
        //Create the space with the UserGrantedEntitlementModule
        uint256 spaceID = 1;
        string memory spaceName = "testspace";
        createTestSpaceWithUserGrantedEntitlementModule(spaceName);

        //Verify the creator is the space owner
        address spaceOwner = zionSpaceManager.getSpaceOwner(spaceID);
        assertEq(spaceOwner, address(this));
    }

    function testCreatorIsEntitledAdmin() public {
        //Create the space with the UserGrantedEntitlementModule
        uint256 spaceID = 1;
        uint256 roomID = 0;
        string memory spaceName = "testspace";
        address userAddress = address(this);
        createTestSpaceWithUserGrantedEntitlementModule(spaceName);

        //Verify the user is entitled administrator to the space
        bool isEntitled = zionSpaceManager.isEntitled(
            spaceID,
            roomID,
            SpaceStructs.EntitlementType.Administrator,
            userAddress
        );
        assertTrue(isEntitled);
        assertEq(roomID, 0);
    }

    function testRandomIsNotEntitledAdmin() public {
        //Create the space with the UserGrantedEntitlementModule
        uint256 spaceID = 1;
        uint256 roomID = 0;
        string memory spaceName = "testspace";
        address randomAddress = address(
            0x9153F17C52f769Da46C1e85c1A93FCB23D427660
        );
        createTestSpaceWithUserGrantedEntitlementModule(spaceName);

        //Verify the user is not entitled administrator to the space
        bool isEntitled = zionSpaceManager.isEntitled(
            spaceID,
            roomID,
            SpaceStructs.EntitlementType.Administrator,
            randomAddress
        );
        assertFalse(isEntitled);
        assertEq(roomID, 0);
    }
}
