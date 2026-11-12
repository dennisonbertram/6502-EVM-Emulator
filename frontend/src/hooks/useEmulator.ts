'use client';

import { create } from 'zustand';
import {
  publicClient,
  walletClient,
  EMULATOR_ABI,
  parseCPUState,
  ANVIL_PRIVATE_KEY,
  type CPUState
} from '@/lib/emulator';
import type { Address, Log } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface EmulatorStore {
  // State
  contractAddress: Address | null;
  cpu: CPUState | null;
  halted: boolean;
  output: Uint8Array;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setContractAddress: (address: Address) => void;
  connect: (address: Address) => Promise<void>;
  refreshState: () => Promise<void>;
  sendKeys: (keys: string) => Promise<void>;
  run: (steps: bigint) => Promise<void>;
  step: () => Promise<void>;
  boot: () => Promise<void>;
  appendOutput: (chars: number[]) => void;
  clearOutput: () => void;
}

export const useEmulatorStore = create<EmulatorStore>((set, get) => ({
  contractAddress: null,
  cpu: null,
  halted: false,
  output: new Uint8Array(0),
  isConnected: false,
  isLoading: false,
  error: null,

  setContractAddress: (address) => set({ contractAddress: address }),

  connect: async (address) => {
    set({ isLoading: true, error: null });
    try {
      // Verify contract exists
      const code = await publicClient.getBytecode({ address });
      if (!code || code === '0x') {
        throw new Error('No contract at address');
      }
      set({ contractAddress: address, isConnected: true });
      await get().refreshState();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Connection failed', isConnected: false });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshState: async () => {
    const { contractAddress } = get();
    if (!contractAddress) return;

    try {
      const [cpuResult, haltedResult] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: EMULATOR_ABI,
          functionName: 'cpu',
        }) as Promise<readonly [number, number, number, number, number, number, bigint]>,
        publicClient.readContract({
          address: contractAddress,
          abi: EMULATOR_ABI,
          functionName: 'halted',
        }) as Promise<boolean>,
      ]);

      set({
        cpu: parseCPUState(cpuResult),
        halted: haltedResult,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to refresh state' });
    }
  },

  sendKeys: async (keys) => {
    const { contractAddress } = get();
    if (!contractAddress) return;

    set({ isLoading: true, error: null });
    try {
      const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(keys);

      await walletClient.writeContract({
        address: contractAddress,
        abi: EMULATOR_ABI,
        functionName: 'sendKeys',
        args: [keyBytes],
        account,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to send keys' });
    } finally {
      set({ isLoading: false });
    }
  },

  run: async (steps) => {
    const { contractAddress } = get();
    if (!contractAddress) return;

    set({ isLoading: true, error: null });
    try {
      const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);

      // Run and collect events
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: EMULATOR_ABI,
        functionName: 'run',
        args: [steps],
        account,
      });

      // Wait for transaction and get receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse CharOut events using viem's decodeEventLog
      // CharOut event topic: keccak256("CharOut(uint8)")
      const CHAROUT_TOPIC = '0xbdc598aacbeb995e22298063a1b42e0c9e87741a629e80901c5bbf545037a58e';

      const chars: number[] = [];
      for (const log of receipt.logs) {
        // Check if this is a CharOut event from our contract
        if (log.address.toLowerCase() === contractAddress.toLowerCase() &&
            log.topics[0] === CHAROUT_TOPIC) {
          // CharOut event data is just the uint8 ascii value, padded to 32 bytes
          const charValue = parseInt(log.data.slice(-2), 16);
          chars.push(charValue);
        }
      }

      if (chars.length > 0) {
        get().appendOutput(chars);
      }

      await get().refreshState();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to run' });
    } finally {
      set({ isLoading: false });
    }
  },

  step: async () => {
    const { contractAddress } = get();
    if (!contractAddress) return;

    set({ isLoading: true, error: null });
    try {
      const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: EMULATOR_ABI,
        functionName: 'step',
        account,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse CharOut events
      const CHAROUT_TOPIC = '0xbdc598aacbeb995e22298063a1b42e0c9e87741a629e80901c5bbf545037a58e';
      const chars: number[] = [];
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === contractAddress.toLowerCase() &&
            log.topics[0] === CHAROUT_TOPIC) {
          const charValue = parseInt(log.data.slice(-2), 16);
          chars.push(charValue);
        }
      }

      if (chars.length > 0) {
        get().appendOutput(chars);
      }

      await get().refreshState();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to step' });
    } finally {
      set({ isLoading: false });
    }
  },

  boot: async () => {
    const { contractAddress } = get();
    if (!contractAddress) return;

    set({ isLoading: true, error: null });
    try {
      const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);

      await walletClient.writeContract({
        address: contractAddress,
        abi: EMULATOR_ABI,
        functionName: 'boot',
        account,
      });

      get().clearOutput();
      await get().refreshState();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to boot' });
    } finally {
      set({ isLoading: false });
    }
  },

  appendOutput: (chars) => {
    set((state) => {
      const newOutput = new Uint8Array(state.output.length + chars.length);
      newOutput.set(state.output);
      newOutput.set(chars, state.output.length);
      return { output: newOutput };
    });
  },

  clearOutput: () => set({ output: new Uint8Array(0) }),
}));
