// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {DeployFacet as _DeployFacet} from "@towns-protocol/diamond/scripts/common/DeployFacet.s.sol";

contract DeployFacet is _DeployFacet {
    /// @dev Override to set the artifact output directory
    function outDir() internal pure override returns (string memory) {
        return "out/";
    }

    /// @dev Override to set the deployment cache path
    function deploymentCachePath() internal pure override returns (string memory) {
        return "deployments";
    }
}
