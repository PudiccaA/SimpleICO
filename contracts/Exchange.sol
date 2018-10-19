pragma solidity ^0.4.7;

import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import '../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol';
import '../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol';

contract Exchange is Ownable, Pausable {

  // Details of each transfer
  struct Transfer {
    address contract_;
    address to_;
    uint amount_;
    bool failed_;
  }

  // mapping from transaction ID to sender address
  mapping(address => uint[]) public transactionIndexesToSender;

  // Create a list of all transfers successful or unsuccessful
  Transfer[] public transactions;

  // Onwer of this contract
  address public owner;

  // a list of all supported tokens for transfer
  mapping(bytes32 => address) public tokens;

  // create ERC20 interface to use its functions
  ERC20 public ERC20Interface;

  // events notify if transfer successful or failed
  event TransferSuccessful(address indexed from_, address indexed to_, uint256 amount_);

  event TransferFailed(address indexed from_, address indexed to_, uint256 amount_);

  constructor() public {
    owner = msg.sender;
  }

  // add address of token to list of supported tokens using token symbol
  function addNewToken(bytes32 symbol_, address address_) public onlyOwner returns (bool) {
    tokens[symbol_] = address_;
    return true;
  }

  // remove address of token we no longer support
  function removeToken(bytes32 symbol_) public onlyOwner returns (bool) {
    require(tokens[symbol_] != 0x0);
    delete(tokens[symbol_]);
    return true;
  }

  // Function transfering ERC20 tokens to other address
  // It assumes the calling address has approved this contract as spender
  function transferTokens(bytes32 symbol_, address to_, uint256 amount_) public whenNotPaused{
    require(tokens[symbol_] != 0x0);
    require(amount_ > 0);

    address contract_ = tokens[symbol_];
    address from_ = msg.sender;

    ERC20Interface = ERC20(contract_);

    uint256 transactionId = transactions.push(
      Transfer({
        contract_: contract_,
        to_: to_,
        amount_: amount_,
        failed_: true
      })
    );

    transactionIndexesToSender[from_].push(transactionId - 1);

    if(amount_ > ERC20Interface.allowance(from_, address(this))) {
      emit TransferFailed(from_, to_, amount_);
      revert();
    }

    ERC20Interface.transferFrom(from_, to_, amount_);

    transactions[transactionId - 1].failed_ = false;

    emit TransferSuccessful(from_, to_, amount_);
  }

  // allow contract to receive funds
  function() external payable {}

  // withdraw funds from this contract
  function withdraw(address beneficiary) public payable onlyOwner whenNotPaused {
      beneficiary.transfer(address(this).balance);
    }
}
