import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import webconfig from "../webconfig";
import idl from "./idl.json";

let program = null;
let connection = null;
let walletAn = null;
let associatedTokenAccount = null;
const [rewardPool] = anchor.web3.PublicKey.findProgramAddressSync(
  [
    anchor.utils.bytes.utf8.encode("reward-pool"),
    webconfig.MINT_PROGRAM.toBytes(),
  ],
  webconfig.PROGRAM
);
const [vault] = anchor.web3.PublicKey.findProgramAddressSync(
  [anchor.utils.bytes.utf8.encode("vault"), webconfig.MINT_PROGRAM.toBytes()],
  webconfig.PROGRAM
);
const systemProgram = new PublicKey("11111111111111111111111111111111");

export async function initProgram(conn, wallet) {
  try {
    if (program && walletAn?.publicKey) return program;
    connection = conn;
    walletAn = wallet;
    let provider;
    try {
      provider = anchor.getProvider();
    } catch {
      provider = new anchor.AnchorProvider(connection, walletAn, {});
    }
    if (!provider) provider = window.phantom?.solana;
    anchor.setProvider(provider);
    program = new anchor.Program(idl, webconfig.PROGRAM);
    associatedTokenAccount = findAssociatedTokenAddress(walletAn.publicKey);
    return program;
  } catch (error) {
    console.error(error);
  }
}
export async function makeOffer(machinePublicKey, price, maxDuration, disk) {
  try {
    if (!program) {
      return { msg: "Please run initProgram first." };
    }
    if (typeof price == "string") {
      price = parseFloat(price);
    }
    price = price * LAMPORTS_PER_SOL;
    price = new anchor.BN(price);
    maxDuration = new anchor.BN(maxDuration);
    disk = new anchor.BN(disk);
    if (!walletAn || !walletAn.publicKey) {
      return { msg: "walletAn is null,Please run initProgram first." };
    }
    const transaction = await program.methods
      .makeOffer(price, maxDuration, disk)
      .accounts({
        machine: new PublicKey(machinePublicKey),
        owner: walletAn.publicKey,
      })
      .rpc();
    let res = await checkConfirmation(connection, transaction);
    if (res) {
      return { msg: "ok", data: transaction };
    }
  } catch (e) {
    console.error(e);
    return { msg: e.message };
  }
}
export async function cancelOffer(machinePublicKey) {
  try {
    if (!program) {
      return { msg: "Please run initProgram first." };
    }
    const transaction = await program.methods
      .cancelOffer()
      .accounts({
        machine: machinePublicKey,
        owner: walletAn.publicKey,
      })
      .rpc();
    let res = await checkConfirmation(connection, transaction);
    if (res) {
      return { msg: "ok", data: transaction };
    }
  } catch (e) {
    return { msg: e.message };
  }
}
export async function placeOrder(
  machinePublicKey,
  orderId,
  duration,
  metadata
) {
  try {
    if (!program) {
      return { msg: "Please run initProgram first." };
    }
    orderId = anchor.utils.bytes.utf8.encode(orderId);
    var myUint8Array = new Uint8Array(16);
    myUint8Array.set(orderId);
    orderId = myUint8Array;
    if (typeof duration == "string") {
      duration = parseInt(duration);
    }
    let counterSeed = anchor.utils.bytes.utf8.encode("order");
    let seeds = [counterSeed, walletAn.publicKey.toBytes(), orderId];
    let [publick] = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      webconfig.PROGRAM
    );
    if (!walletAn || !walletAn.publicKey) {
      return { msg: "error", error: "walletAn is null" };
    }
    duration = new anchor.BN(duration);
    metadata.machinePublicKey = machinePublicKey;
    metadata = JSON.stringify(metadata);
    const transaction = await program.methods
      .placeOrder(orderId, duration, metadata)
      .accounts({
        machine: machinePublicKey,
        order: publick,
        buyer: walletAn.publicKey,
        buyerAta: associatedTokenAccount,
        vault,
        mint: webconfig.MINT_PROGRAM,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    let res = await checkConfirmation(connection, transaction);
    if (res) {
      return { msg: "ok", data: transaction };
    }
  } catch (e) {
    console.error(e);
    return { msg: e.message };
  }
}
export async function renewOrder(machinePublicKey, orderPublicKey, duration) {
  try {
    if (!program) {
      return { msg: "Please run initProgram first." };
    }
    if (typeof duration == "string") {
      duration = parseInt(duration);
    }
    duration = new anchor.BN(duration);
    const transaction = await program.methods
      .renewOrder(duration)
      .accounts({
        machine: machinePublicKey,
        order: orderPublicKey,
        buyer: walletAn.publicKey,
        buyerAta: associatedTokenAccount,
        vault,
        mint: webconfig.MINT_PROGRAM,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    let res = await checkConfirmation(connection, transaction);
    if (res) {
      return { msg: "ok", data: transaction };
    }
  } catch (e) {
    console.error(e);
    return { msg: e.message };
  }
}

export async function refundOrder(
  machinePublicKey,
  orderPublicKey,
  sellerPublicKey
) {
  try {
    if (!program) {
      return { msg: "Please run initProgram first." };
    }
    const sellerAta = findAssociatedTokenAddress(
      new PublicKey(sellerPublicKey)
    );
    const transaction = await program.methods
      .refundOrder()
      .accounts({
        machine: machinePublicKey,
        order: orderPublicKey,
        buyer: walletAn.publicKey,
        buyerAta: associatedTokenAccount,
        sellerAta,
        vault,
        mint: webconfig.MINT_PROGRAM,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram,
      })
      .rpc();
    const res = await checkConfirmation(connection, transaction);
    if (res) {
      return { msg: "ok", data: transaction };
    }
  } catch (e) {
    console.error(e);
    return { msg: e.message };
  }
}

export async function claimRewards(
  machinePublicKey,
  machineUuid,
  ownerPublicKey,
  period
) {
  try {
    if (!program) {
      return { msg: "Please run initProgram first." };
    }
    const ownerAta = findAssociatedTokenAddress(ownerPublicKey);
    const periodBytes = new anchor.BN(period).toArray("le", 4);
    const uuid = anchor.utils.bytes.hex.decode(machineUuid);
    const rewardSeed = [anchor.utils.bytes.utf8.encode("reward"), periodBytes];
    const [reward] = anchor.web3.PublicKey.findProgramAddressSync(
      rewardSeed,
      webconfig.PROGRAM
    );
    const rewardMachineSeed = [
      anchor.utils.bytes.utf8.encode("reward-machine"),
      periodBytes,
      ownerPublicKey.toBytes(),
      uuid,
    ];
    const [rewardMachine] = anchor.web3.PublicKey.findProgramAddressSync(
      rewardMachineSeed,
      webconfig.PROGRAM
    );
    const instruction = await program.methods
      .claim(period)
      .accounts({
        machine: machinePublicKey,
        reward,
        rewardMachine,
        owner: ownerPublicKey,
        ownerAta,
        rewardPool,
        mint: webconfig.MINT_PROGRAM,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram,
      })
      .instruction();
    return instruction;
  } catch (e) {
    console.error(e);
    return { msg: e.message };
  }
}

const findAssociatedTokenAddress = (walletAddress) => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      webconfig.MINT_PROGRAM.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

export const checkConfirmation = async (connection, tx) => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const latestBlockHash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction(
        {
          blockhash: latestBlockHash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          signature: tx,
        },
        "finalized"
      );
      resolve(confirmation);
    }, 3000);
  });
};
