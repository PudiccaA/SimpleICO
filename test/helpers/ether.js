function ether(n) {
  //return new BN(web3.utils.toWei(n, "ether"));
  return web3.utils.toWei(n, "ether");
}

module.exports = {
  ether
};
