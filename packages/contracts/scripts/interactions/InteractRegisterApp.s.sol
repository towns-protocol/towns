// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IAppRegistry} from "src/apps/facets/registry/IAppRegistry.sol";

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {SimpleApp} from "src/apps/helpers/SimpleApp.sol";
import {IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";

contract InteractRegisterApp is Interaction, IAppRegistryBase {
    function __interact(address deployer) internal override {
        address appRegistry = getDeployment("appRegistry");

        // update with the bot public keys you want to register
        address[] memory bots = new address[](1);
        bots[0] = deployer; // update this with you public key bot address

        // update with the permissions you want to set for the app
        bytes32[] memory permissions = new bytes32[](1);
        permissions[0] = bytes32("Read");

        AppParams memory appData = AppParams({
            name: "simple.app",
            permissions: permissions,
            clients: bots
        });

        vm.broadcast(deployer);
        (address app, bytes32 appId) = IAppRegistry(appRegistry).createApp(appData);

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
