// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {PaymentSplitter} from "../src/PaymentSplitter.sol";
import {TestToken} from "../src/TestToken.sol";

contract PaymentSplitterTest is Test {
    PaymentSplitter public splitter;
    TestToken public token;
    
    address public treasury = address(0x2);
    address public payer = address(0x3);
    address public listener = address(0x4);
    
    function setUp() public {
        token = new TestToken();
        splitter = new PaymentSplitter(treasury);
        
        // Fund payer for testing
        token.mint(payer, 1000 * 10**18);
    }
    
    function testPayAndSplit() public {
        uint256 amount = 100 * 10**18;
        
        vm.startPrank(payer);
        token.approve(address(splitter), amount);
        splitter.payAndSplit(token, listener, amount, 600);
        vm.stopPrank();
        
        assertEq(token.balanceOf(listener), amount / 2);
        assertEq(token.balanceOf(treasury), amount - amount / 2);
    }
}