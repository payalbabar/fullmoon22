import { LotteryContract, computeCommitment } from '../frontend/src/contract.js';
import { getWalletState } from './wallet.js';

async function runCli() {
  const wallet = getWalletState();
  const lottery = new LotteryContract(1000000n);

  console.log(`--- Midnight Decentralized Lottery CLI ---`);
  console.log(`Connected Wallet: ${wallet.address}`);
  console.log(`Contract Initial State: Round ${lottery.state.round_id}, Pot: ${lottery.state.pot_balance}`);

  // Test purchase
  const secret = 'user_secret_ticket_123';
  const depositRes = lottery.deposit_entry(secret);
  console.log(`[CLI] Purchased ticket 1. ZK Commitment: ${depositRes.commitment}`);
  console.log(`[CLI] On-chain state: ${lottery.state.ticket_count} tickets, Pot: ${lottery.state.pot_balance} tNIGHT`);

  // Draw
  const vrfReveal = 'vrf_random_seed_999';
  const drawRes = lottery.draw_winner(0, vrfReveal);
  console.log(`[CLI] Winner Drawn! Winning Ticket Index: ${lottery.state.winning_index}`);
  console.log(`[CLI] Winning Commitment: ${drawRes.winningCommitment}`);

  // Claim
  const claimRes = lottery.claim_prize(secret);
  console.log(`[CLI] Claim Prize Verified in ZK: ${claimRes.success}`);
  console.log(`[CLI] Remaining Pot Balance: ${lottery.state.pot_balance}`);
}

runCli().catch(console.error);
