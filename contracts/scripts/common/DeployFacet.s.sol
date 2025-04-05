// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {DeployBase} from "./DeployBase.s.sol";
import {DeployLib} from "@towns-protocol/diamond/scripts/common/DeployLib.sol";

contract DeployFacet is DeployBase {
    string private artifactPath;

    /// @dev Wrapper function that captures artifactPath in its closure
    function _deployWrapper(address) internal returns (address) {
        return DeployLib.deployCode(artifactPath, "");
    }

    /// @notice Deploys a facet contract using the contract name from environment variables
    /// @dev This function:
    ///      - Reads CONTRACT_NAME from environment variables
    ///      - Constructs the artifact path and version name
    ///      - Uses DeployBase's deploy function with a curried deployment wrapper
    /// @return The address of the deployed facet contract
    function run() external returns (address) {
        string memory name = vm.envString("CONTRACT_NAME");
        return deploy(name, msg.sender);
    }

    /// @notice Deploys a facet contract using the provided name and deployer address
    function deploy(
        string memory name,
        address deployer
    )
        public
        broadcastWith(deployer)
        returns (address)
    {
        artifactPath = string.concat(outDir(), "/", name, ".sol/", name, ".json");
        string memory versionName = string.concat("facets/", name);

        // call the base deploy function with our curried function
        return deploy(msg.sender, versionName, _deployWrapper);
    }
}
