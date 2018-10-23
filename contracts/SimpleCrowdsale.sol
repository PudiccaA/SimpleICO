pragma solidity ^0.4.7;

import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import '../node_modules/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import '../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol';
import '../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol';
import '../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol';
import '../node_modules/openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol';
import '../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol';
import '../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol';

contract SimpleCrowdsale is Ownable, Pausable, AllowanceCrowdsale, CappedCrowdsale, TimedCrowdsale {
  using SafeERC20 for ERC20;
  using SafeMath for uint256;

  // Onwer of this contract & Wallet to store the ETH
  address public owner;

  // the rate of exchange
  uint256 public rateExchange;

  // set upper/lower bound of cap and track investor contributions
  uint256 public contributionMin = 2000000000000000; // 0.002 Ether
  uint256 public contributionMax = 50000000000000000000; // 50 Ether
  mapping(address => uint256) public contributions;

  constructor(
    uint256 _rate,
    address _wallet,
    ERC20 _token,
    uint256 _cap,
    address _tokenVault,
    uint256 _openingTime,
    uint256 _closingTime
  ) Crowdsale(_rate, _wallet, _token)
    AllowanceCrowdsale(_tokenVault)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    public {
    owner = msg.sender;
  }

  // allow contract to receive funds
  //function() external payable {}

  function getUserContribution(address _beneficiary) public view returns(uint256) {
    return contributions[_beneficiary];
  }

  // withdraw funds from this contract
  function withdraw(address toBeneficiary) public payable onlyOwner whenNotPaused {
      toBeneficiary.transfer(this.wallet().balance);
    }

  // validate purchse cap
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  ) internal {
    super._preValidatePurchase(_beneficiary, _weiAmount);
    uint256 _existingContribution = contributions[_beneficiary];
    uint256 _newContribution = _existingContribution.add(_weiAmount);
    require(_newContribution >= contributionMin && _newContribution <= contributionMax);
    contributions[_beneficiary] = _newContribution;
  }

}
