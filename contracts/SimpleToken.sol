pragma solidity ^0.4.7;

import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol';

contract SimpleToken is ERC20, DetailedERC20 {

  constructor(string _name, string _symbol, uint8 _decimals)
      DetailedERC20(_name, _symbol, _decimals)
      ERC20()
      public {}
}
