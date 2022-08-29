// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Script.sol";
import {ZionSpaceManager} from "../../contracts/spaces/ZionSpaceManager.sol";
import {UserGrantedEntitlementModule} from "../../contracts/spaces/entitlement_modules/UserGrantedEntitlementModule.sol";
import {TokenEntitlementModule} from "../../contracts/spaces/entitlement_modules/TokenEntitlementModule.sol";

// import "../contracts/spaces/ZionSpaceManager.sol";

contract DeployZionSpaceManager is Script {
    function run() external {
        vm.startBroadcast();

        ZionSpaceManager zionSpaceManager = new ZionSpaceManager();
        console.log(
            "Deploying ZionSpaceManager a: ",
            address(zionSpaceManager)
        );

        UserGrantedEntitlementModule grantedEntitlementModule = new UserGrantedEntitlementModule(
                address(zionSpaceManager)
            );

        TokenEntitlementModule tokenEntitlementModule = new TokenEntitlementModule(
                address(zionSpaceManager)
            );

        vm.stopBroadcast();
    }
}
