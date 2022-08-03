const Minty = artifacts.require("Minty");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Minty", function (/* accounts */) {
  it("should deploy", async function () {
    await Minty.deployed();
    return assert.isTrue(true);
  });
  it("can mint", async function () {})

  // this is only in the preset class i think
  // it("can pause & unpause", async function () {})
  
  it("can transfer", async function () {})
  it("can burn", async function () {})
});
