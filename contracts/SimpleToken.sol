pragma solidity ^0.4.7;

import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol';

contract SimpleToken is ERC20, ERC20Detailed {

  constructor(string _name, string _symbol, uint8 _decimals)
      ERC20Detailed(_name, _symbol, _decimals)
      public {
        _mint(msg.sender, 10000 * (10 ** uint256(_decimals)));
      }
}
