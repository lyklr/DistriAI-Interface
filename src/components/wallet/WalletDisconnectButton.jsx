import React from "react";
import { BaseWalletDisconnectButton } from "./BaseWalletDisconnectButton";

const LABELS = {
  disconnecting: "Disconnecting ...",
  "has-wallet": "Disconnect",
  "no-wallet": "Disconnect Wallet",
};

export function WalletDisconnectButton(props) {
  return <BaseWalletDisconnectButton {...props} labels={LABELS} />;
}
