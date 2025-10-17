// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TestToken} from "../src/TestToken.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";

contract DeployScript is Script {
    // Example treasury for local deployments; override via env if needed
    address public constant TREASURY_ADDRESS = address(0xBabeDeadF00d);

    function run() public returns (TestToken token, PaymentSplitter splitter) {
        vm.startBroadcast();

        token = new TestToken();
        console2.log("--- Token Contract Deployed ---");
        console2.log("TestToken Address:", address(token));

        splitter = new PaymentSplitter(TREASURY_ADDRESS);
        console2.log("--- Splitter Contract Deployed ---");
        console2.log("PaymentSplitter Address:", address(splitter));
        console2.log("Treasury Address:", TREASURY_ADDRESS);

        vm.stopBroadcast();
    }
}
