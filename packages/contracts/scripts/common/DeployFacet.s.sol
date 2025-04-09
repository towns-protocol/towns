// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {DeployBase} from "./DeployBase.s.sol";
import {DeployFacet as _DeployFacet} from "@towns-protocol/diamond/scripts/common/DeployFacet.s.sol";

contract DeployFacet is DeployBase, _DeployFacet {}
