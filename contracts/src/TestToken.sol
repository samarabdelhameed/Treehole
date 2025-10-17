// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 tokens
    mapping(address => uint256) public lastClaim;
    uint256 public constant CLAIM_COOLDOWN = 1 hours;

    constructor() ERC20("Test Token", "TEST") {
        _mint(msg.sender, 1000000 * 10**18); // Initial supply
    }

    function claimFaucet() external {
        require(
            block.timestamp >= lastClaim[msg.sender] + CLAIM_COOLDOWN,
            "Claim cooldown not met"
        );
        
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}