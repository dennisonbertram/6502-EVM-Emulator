import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { anvil } from 'viem/chains';
import emulatorAbi from './emulator-abi.json';

export const EMULATOR_ABI = emulatorAbi;

// Default Anvil account
export const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

export const publicClient = createPublicClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545'),
});

export const walletClient = createWalletClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545'),
});

export interface CPUState {
  A: number;
  X: number;
  Y: number;
  SP: number;
  PC: number;
  P: number;
  cycles: bigint;
}

export interface EmulatorState {
  contractAddress: Address | null;
  cpu: CPUState | null;
  halted: boolean;
  output: string;
  isConnected: boolean;
}

export const parseCPUState = (result: readonly [number, number, number, number, number, number, bigint]): CPUState => ({
  A: result[0],
  X: result[1],
  Y: result[2],
  SP: result[3],
  PC: result[4],
  P: result[5],
  cycles: result[6],
});

export const formatHex8 = (val: number): string => val.toString(16).toUpperCase().padStart(2, '0');
export const formatHex16 = (val: number): string => val.toString(16).toUpperCase().padStart(4, '0');

export const formatFlags = (p: number): string => {
  const flags = ['N', 'V', '-', 'B', 'D', 'I', 'Z', 'C'];
  return flags.map((f, i) => (p & (0x80 >> i)) ? f : '.').join('');
};
