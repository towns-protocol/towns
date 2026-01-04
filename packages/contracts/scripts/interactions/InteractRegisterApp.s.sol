// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppFactory} from "src/apps/facets/factory/IAppFactory.sol";

// contracts
import {Interaction} from "../common/Interaction.s.sol";
import {IAppFactoryBase} from "src/apps/facets/factory/IAppFactory.sol";

contract InteractRegisterApp is Interaction, IAppFactoryBase {
    function __interact(address deployer) internal override {
        address appRegistry = getDeployment("appRegistry");

        // update with the bot public keys you want to register
        address client = deployer; // update this with you public key bot address

        // update with the permissions you want to set for the app
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        uint256 installPrice = 0.001 ether;
        uint48 accessDuration = 365 days;

        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            client: client,
            installPrice: installPrice,
            accessDuration: accessDuration
        });

        vm.broadcast(deployer);
        (address app, bytes32 appId) = IAppFactory(appRegistry).createApp(appData);

        saveApp("SimpleApp", appId, address(app));
    }

    function saveApp(string memory versionName, bytes32 appId, address contractAddr) internal {
        if (!shouldSaveDeployments()) {
            debug("(set SAVE_DEPLOYMENTS=1 to save deployments to file)");
            return;
        }

        string memory networkDir = networkDirPath();

        // create addresses directory
        createDir(string.concat(networkDir, "/apps"));

        // get deployment path
        string memory path = string.concat(networkDir, "/apps/", versionName, ".json");

        // save deployment
        debug("saving deployment to: ", path);
        string memory contractJson = vm.serializeAddress("apps", "address", contractAddr);
        string memory appJson = vm.serializeBytes32("apps", "appId", appId);
        vm.writeJson(contractJson, path);
        vm.writeJson(appJson, path);
    }
}
