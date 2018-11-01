pragma solidity ^0.4.7;

import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/lifecycle/Pausable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol';
import 'openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol';
import 'openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol';
import 'openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol';
import 'openzeppelin-solidity/contracts/drafts/TokenVesting.sol';

contract TimelockedCrowdsale is Ownable, Pausable, AllowanceCrowdsale, CappedCrowdsale, TimedCrowdsale, FinalizableCrowdsale {
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

  // distribution of tokens
  address public teamFund;
  address public partnersFund;
  uint256 public cliffDurationTeamFundLock;
  uint256 public durationTeamFundLock;
  uint256 public cliffDurationPartnersFundLock;
  uint256 public durationPartnersFundLock;

  // Token time lock
  address[] public beneficiaryLocks;
  uint256 public start;
  uint256 public cliffDuration;
  uint256 public duration;
  bool public revocable;

  // events to be emitted
  event CreatedLock(TokenVesting newTokenLock);

  constructor(
    uint256 _rate,
    address _wallet,
    ERC20 _token,
    uint256 _cap,
    address _tokenVault,
    uint256 _openingTime,
    uint256 _closingTime,
    uint256 _start,
    uint256 _cliffDuration,
    uint256 _duration,
    bool _revocable
  ) Crowdsale(_rate, _wallet, _token)
    AllowanceCrowdsale(_tokenVault)
    CappedCrowdsale(_cap)
    TimedCrowdsale(_openingTime, _closingTime)
    public {
    owner = msg.sender;
    start = _start;
    cliffDuration = _cliffDuration;
    duration = _duration;
    revocable = _revocable;
  }

  function getUserContribution(address _beneficiary) public view returns(uint256) {
    return contributions[_beneficiary];
  }

  // withdraw funds from this contract
  function withdraw(address toBeneficiary) public payable onlyOwner whenNotPaused {
      toBeneficiary.transfer(this.wallet().balance);
    }

  // token lock factory
  function createTokenLock(
    address _beneficiary,
    uint256 _start,
    uint256 _cliffDuration,
    uint256 _duration,
    bool _revocable
  ) public returns(TokenVesting) {
    TokenVesting newTokenLock = new TokenVesting(
      _beneficiary,
      _start,
      _cliffDuration,
      _duration,
      _revocable
    );
    beneficiaryLocks.push(newTokenLock);
    newTokenLock.transferOwnership(owner);
    emit CreatedLock(newTokenLock);
    return newTokenLock;
  }

  // returns a list of all created token locks
  function getTokenLocks() public view returns (address[]) {
    return beneficiaryLocks;
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

  // override the _processPurchase function to deliver tokens to the vests
  function _processPurchase(
    address beneficiary,
    uint256 tokenAmount
  )
    internal
  {
    TokenVesting newTokenLock = createTokenLock(
      beneficiary,
      start,
      cliffDuration,
      duration,
      revocable
    );
    super._deliverTokens(newTokenLock, tokenAmount);
  }

  // override to add finalization logic
  function _finalization() internal {
    TokenVesting teamFundLock = new TokenVesting(
      teamFund,
      start,
      cliffDurationTeamFundLock,
      durationTeamFundLock,
      revocable=true
    );

    TokenVesting partnersFundLock = new TokenVesting(
      partnersFund,
      start,
      cliffDurationPartnersFundLock,
      durationPartnersFundLock,
      revocable=true
    );

    super._finalization();
  }
}
