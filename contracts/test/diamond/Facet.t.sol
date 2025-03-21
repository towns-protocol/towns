// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IDiamond} from "@towns-protocol/diamond/src/IDiamond.sol";
import {FacetHelper as _FacetHelper} from "@towns-protocol/diamond/scripts/common/helpers/FacetHelper.s.sol";

abstract contract FacetHelper is IDiamond, _FacetHelper {}
