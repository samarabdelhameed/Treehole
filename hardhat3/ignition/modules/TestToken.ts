import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TestTokenModule", (m) => {
  const testToken = m.contract("TestToken");

  //m.call(counter, "incBy", [5n]);

  return { testToken };
});
