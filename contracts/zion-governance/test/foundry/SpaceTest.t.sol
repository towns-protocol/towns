// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Test.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "../../contracts/spaces/entitlement_modules/UserGrantedEntitlementModule.sol";
import {SpaceStructs} from "../../contracts/spaces/SpaceStructs.sol";

contract SpaceBaseTest {
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
}
