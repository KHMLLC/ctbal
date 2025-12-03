import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CTBALTokenV2Module = buildModule("CTBALTokenV2Module", (m) => {
  const ctbalTokenV2 = m.contract("CTBALTokenV2Enhanced", []);

  return { ctbalTokenV2 };
});

export default CTBALTokenV2Module;