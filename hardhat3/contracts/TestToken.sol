// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20, Ownable {
    // 18 decimals by default in ERC20
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // 1000 tokens

    constructor() ERC20("TreeHole Token", "THT") Ownable(msg.sender) {}

    /// @notice Allows any user to claim 1000 THT for testing purposes.
    function claimFaucet() public {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @dev Owner-only mint to simplify hackathon testing.
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}