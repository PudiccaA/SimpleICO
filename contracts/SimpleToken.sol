pragma solidity ^0.4.7;

import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol';
import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol';

contract SimpleToken is StandardToken, DetailedERC20 {

  constructor(string _name, string _symbol, uint8 _decimals)
      DetailedERC20(_name, _symbol, _decimals)
      public {}
}
