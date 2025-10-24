import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


export default buildModule("PaymentSplitterModule", (m) => {

const myAddress = '0xF565371679083ED779F9Ef6bdeA7Bd29a6D6EEAE' 
  const treasuryAddress = m.getParameter(
      "_treasury",
      myAddress
    );

  const paymentSplitter = m.contract("PaymentSplitter", [treasuryAddress]);

  return { paymentSplitter };
});
