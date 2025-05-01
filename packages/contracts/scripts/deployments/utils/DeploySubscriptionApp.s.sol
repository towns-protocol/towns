// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries
import {LibClone} from "solady/utils/LibClone.sol";

//contracts
import {Deployer} from "scripts/common/Deployer.s.sol";
import {SubscriptionApp} from "src/modules/apps/subscription/SubscriptionApp.sol";

contract DeploySubscriptionApp is Deployer {
    function versionName() public pure override returns (string memory) {
        return "utils/subscriptionApp";
    }

    function __deploy(address deployer) internal override returns (address) {
        vm.startBroadcast(deployer);
        address implementation = address(new SubscriptionApp());
        address app = LibClone.clone(implementation);
        SubscriptionApp(payable(app)).__SubscriptionApp_init(deployer, 100); // 1% fee
        vm.stopBroadcast();
        return app;
    }
}
