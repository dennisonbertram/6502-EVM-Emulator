#!/usr/bin/env npx tsx
/**
 * EhBASIC Initialization Script
 *
 * This script performs the complete initialization sequence for EhBASIC,
 * matching the working test in HelloWorld.t.sol.
 */

import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { anvil } from 'viem/chains';

// Contract address from deployment (ROM at $C000)
const EMULATOR_ADDRESS: Address = '0x70e0ba845a1a0f2da3359c97e0285013525ffc49';

// Default Anvil account
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

// CharOut event topic (keccak256("CharOut(uint8)"))
const CHAROUT_TOPIC = '0xbdc598aacbeb995e22298063a1b42e0c9e87741a629e80901c5bbf545037a58e';

const EMULATOR_ABI = [
  { name: 'boot', type: 'function', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { name: 'run', type: 'function', inputs: [{ name: 'steps', type: 'uint64' }], outputs: [], stateMutability: 'nonpayable' },
  { name: 'step', type: 'function', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { name: 'sendKeys', type: 'function', inputs: [{ name: 'keys', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
  { name: 'poke8', type: 'function', inputs: [{ name: 'addr', type: 'uint16' }, { name: 'val', type: 'uint8' }], outputs: [], stateMutability: 'nonpayable' },
  { name: 'peek8', type: 'function', inputs: [{ name: 'addr', type: 'uint16' }], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { name: 'cpu', type: 'function', inputs: [], outputs: [
    { name: 'A', type: 'uint8' },
    { name: 'X', type: 'uint8' },
    { name: 'Y', type: 'uint8' },
    { name: 'SP', type: 'uint8' },
    { name: 'PC', type: 'uint16' },
    { name: 'P', type: 'uint8' },
    { name: 'cycles', type: 'uint64' }
  ], stateMutability: 'view' },
  { name: 'halted', type: 'function', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'event', name: 'CharOut', inputs: [{ name: 'ascii', type: 'uint8', indexed: false }] }
] as const;

const publicClient = createPublicClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545'),
});

const walletClient = createWalletClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545'),
});

const account = privateKeyToAccount(ANVIL_PRIVATE_KEY);

async function poke8(addr: number, val: number): Promise<void> {
  const hash = await walletClient.writeContract({
    address: EMULATOR_ADDRESS,
    abi: EMULATOR_ABI,
    functionName: 'poke8',
    args: [addr, val],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

async function patchIOVectors(): Promise<void> {
  console.log('  Patching I/O vectors...');

  // CHROUT stub at $0400: STA $F001; RTS
  await poke8(0x0400, 0x8D); // STA abs
  await poke8(0x0401, 0x01);
  await poke8(0x0402, 0xF0); // $F001 (IO_TTY)
  await poke8(0x0403, 0x60); // RTS

  // Patch CHROUT vector at $0302/$0303
  await poke8(0x0302, 0x00); // low byte
  await poke8(0x0303, 0x04); // high byte -> $0400

  // CHRIN stub at $0410: LDA $F000; RTS
  await poke8(0x0410, 0xAD); // LDA abs
  await poke8(0x0411, 0x00);
  await poke8(0x0412, 0xF0); // $F000 (IO_KBD)
  await poke8(0x0413, 0x60); // RTS

  // Patch CHRIN vector at $0300/$0301
  await poke8(0x0300, 0x10); // low byte
  await poke8(0x0301, 0x04); // high byte -> $0410

  console.log('  I/O vectors patched.');
}

async function parseCharOutEvents(hash: Hex): Promise<number[]> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const chars: number[] = [];

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === EMULATOR_ADDRESS.toLowerCase() &&
        log.topics[0] === CHAROUT_TOPIC) {
      const charValue = parseInt(log.data.slice(-2), 16);
      chars.push(charValue);
    }
  }

  return chars;
}

// Convert string to hex bytes for sendKeys
function stringToHex(str: string): Hex {
  let hex = '0x';
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex as Hex;
}

async function main() {
  console.log('=== EhBASIC Initialization Script ===\n');
  console.log(`Contract: ${EMULATOR_ADDRESS}`);

  // Check contract exists
  const code = await publicClient.getBytecode({ address: EMULATOR_ADDRESS });
  if (!code || code === '0x') {
    console.error('ERROR: No contract at address');
    process.exit(1);
  }
  console.log('Contract verified.\n');

  // Step 1: Send cold start keys "C\r\r"
  console.log('Step 1: Sending cold start keys "C\\r\\r"...');
  const coldStartKeysHex = stringToHex('C\r\r');
  let hash = await walletClient.writeContract({
    address: EMULATOR_ADDRESS,
    abi: EMULATOR_ABI,
    functionName: 'sendKeys',
    args: [coldStartKeysHex],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('  Keys sent.\n');

  // Step 2: RE-PATCH I/O vectors IMMEDIATELY after keys (before running cycles!)
  // This is critical - EhBASIC will overwrite vectors during cold start
  console.log('Step 2: Patching I/O vectors (before EhBASIC runs)...');
  await patchIOVectors();
  console.log('');

  // Step 3: Send BASIC program
  console.log('Step 3: Sending BASIC program...');
  const basicProgram = stringToHex('10 PRINT "HELLO"\rRUN\r');
  hash = await walletClient.writeContract({
    address: EMULATOR_ADDRESS,
    abi: EMULATOR_ABI,
    functionName: 'sendKeys',
    args: [basicProgram],
    account,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log('  BASIC program: 10 PRINT "HELLO"\\nRUN\n');

  // Step 4: Run 1,000,000 cycles (matching the test)
  console.log('Step 4: Running 1,000,000 cycles...');
  hash = await walletClient.writeContract({
    address: EMULATOR_ADDRESS,
    abi: EMULATOR_ABI,
    functionName: 'run',
    args: [1000000n],
    account,
    gas: 90000000000n, // High gas for 6502 emulation
  });
  const chars = await parseCharOutEvents(hash);
  console.log(`  CharOut events: ${chars.length}`);

  if (chars.length > 0) {
    // Convert to printable text
    const text = chars
      .map(c => {
        if (c === 0x0D) return '\n'; // CR -> newline
        if (c === 0x0A) return ''; // Skip LF
        if (c >= 0x20 && c < 0x7F) return String.fromCharCode(c);
        return '';
      })
      .join('');
    console.log('\n=== EhBASIC OUTPUT ===');
    console.log(text);
    console.log('======================\n');
  } else {
    console.log('  No output captured.\n');
  }

  // Check CPU state
  const cpu = await publicClient.readContract({
    address: EMULATOR_ADDRESS,
    abi: EMULATOR_ABI,
    functionName: 'cpu',
  });
  console.log('CPU State:');
  console.log(`  A=$${cpu[0].toString(16).padStart(2, '0')} X=$${cpu[1].toString(16).padStart(2, '0')} Y=$${cpu[2].toString(16).padStart(2, '0')}`);
  console.log(`  SP=$${cpu[3].toString(16).padStart(2, '0')} PC=$${cpu[4].toString(16).padStart(4, '0')}`);
  console.log(`  Cycles: ${cpu[6]}`);

  const halted = await publicClient.readContract({
    address: EMULATOR_ADDRESS,
    abi: EMULATOR_ABI,
    functionName: 'halted',
  });
  console.log(`  Halted: ${halted}`);

  console.log('\n=== Initialization Complete ===');
}

main().catch(console.error);
