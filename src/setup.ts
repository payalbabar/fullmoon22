import { getNetworkConfig } from './network.js';
import { getWalletState } from './wallet.js';
import { LotteryContract } from '../frontend/src/contract.js';

export function setupEnvironment(networkName: string = 'preview') {
  const config = getNetworkConfig(networkName);
  const wallet = getWalletState();
  const contract = new LotteryContract(1000000n);

  console.log(`[Setup] Target Network: ${config.name}`);
  console.log(`[Setup] Node Endpoint: ${config.nodeUrl}`);
  console.log(`[Setup] Indexer Endpoint: ${config.indexerUrl}`);
  console.log(`[Setup] Deployer Wallet Address: ${wallet.address}`);

  return { config, wallet, contract };
}

if (process.argv[1]?.includes('setup.ts')) {
  setupEnvironment();
}
