// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// interfaces

// libraries

// contracts

import {DeployBase} from "./DeployBase.s.sol";
import {Script} from "forge-std/Script.sol";

abstract contract Interaction is Script, DeployBase {
    // override this with the actual deployment logic, no need to worry about:
    // - existing deployments
    // - loading private keys
    // - saving deployments
    // - logging
    function __interact(address deployer) internal virtual;

    // will first try to load existing deployments from `deployments/<network>/<contract>.json`
    // if OVERRIDE_DEPLOYMENTS is set or if no deployment is found:
    // - read PRIVATE_KEY from env
    // - invoke __deploy() with the private key
    // - save the deployment to `deployments/<network>/<contract>.json`
    function interact() public virtual {
        address deployer = _msgSender();

        info(
            string.concat(
                unicode"running interaction",
                unicode"\n\t⚡️ on ",
                chainIdAlias(),
                unicode"\n\t📬 from deployer address"
            ),
            vm.toString(deployer)
        );

        __interact(deployer);

        info(unicode"🎉🎉", " interaction complete");
    }

    function run() public virtual {
        interact();
    }

    function _msgSender() internal view returns (address) {
        return msg.sender;
    }
}
