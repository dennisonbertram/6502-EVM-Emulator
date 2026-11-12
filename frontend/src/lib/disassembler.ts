// 6502 Disassembler

interface OpcodeInfo {
  mnemonic: string;
  mode: string;
  bytes: number;
}

// Addressing mode formatters
const formatOperand = (mode: string, bytes: number[]): string => {
  switch (mode) {
    case 'implied':
    case 'accumulator':
      return '';
    case 'immediate':
      return `#$${bytes[0].toString(16).padStart(2, '0').toUpperCase()}`;
    case 'zeroPage':
      return `$${bytes[0].toString(16).padStart(2, '0').toUpperCase()}`;
    case 'zeroPageX':
      return `$${bytes[0].toString(16).padStart(2, '0').toUpperCase()},X`;
    case 'zeroPageY':
      return `$${bytes[0].toString(16).padStart(2, '0').toUpperCase()},Y`;
    case 'absolute':
      return `$${((bytes[1] << 8) | bytes[0]).toString(16).padStart(4, '0').toUpperCase()}`;
    case 'absoluteX':
      return `$${((bytes[1] << 8) | bytes[0]).toString(16).padStart(4, '0').toUpperCase()},X`;
    case 'absoluteY':
      return `$${((bytes[1] << 8) | bytes[0]).toString(16).padStart(4, '0').toUpperCase()},Y`;
    case 'indirect':
      return `($${((bytes[1] << 8) | bytes[0]).toString(16).padStart(4, '0').toUpperCase()})`;
    case 'indexedIndirect':
      return `($${bytes[0].toString(16).padStart(2, '0').toUpperCase()},X)`;
    case 'indirectIndexed':
      return `($${bytes[0].toString(16).padStart(2, '0').toUpperCase()}),Y`;
    case 'relative':
      const offset = bytes[0] > 127 ? bytes[0] - 256 : bytes[0];
      return `$${offset.toString(16).toUpperCase()} (${offset >= 0 ? '+' : ''}${offset})`;
    default:
      return '';
  }
};

// Opcode lookup table
const OPCODES: Record<number, OpcodeInfo> = {
  // ADC
  0x69: { mnemonic: 'ADC', mode: 'immediate', bytes: 2 },
  0x65: { mnemonic: 'ADC', mode: 'zeroPage', bytes: 2 },
  0x75: { mnemonic: 'ADC', mode: 'zeroPageX', bytes: 2 },
  0x6D: { mnemonic: 'ADC', mode: 'absolute', bytes: 3 },
  0x7D: { mnemonic: 'ADC', mode: 'absoluteX', bytes: 3 },
  0x79: { mnemonic: 'ADC', mode: 'absoluteY', bytes: 3 },
  0x61: { mnemonic: 'ADC', mode: 'indexedIndirect', bytes: 2 },
  0x71: { mnemonic: 'ADC', mode: 'indirectIndexed', bytes: 2 },

  // AND
  0x29: { mnemonic: 'AND', mode: 'immediate', bytes: 2 },
  0x25: { mnemonic: 'AND', mode: 'zeroPage', bytes: 2 },
  0x35: { mnemonic: 'AND', mode: 'zeroPageX', bytes: 2 },
  0x2D: { mnemonic: 'AND', mode: 'absolute', bytes: 3 },
  0x3D: { mnemonic: 'AND', mode: 'absoluteX', bytes: 3 },
  0x39: { mnemonic: 'AND', mode: 'absoluteY', bytes: 3 },
  0x21: { mnemonic: 'AND', mode: 'indexedIndirect', bytes: 2 },
  0x31: { mnemonic: 'AND', mode: 'indirectIndexed', bytes: 2 },

  // ASL
  0x0A: { mnemonic: 'ASL', mode: 'accumulator', bytes: 1 },
  0x06: { mnemonic: 'ASL', mode: 'zeroPage', bytes: 2 },
  0x16: { mnemonic: 'ASL', mode: 'zeroPageX', bytes: 2 },
  0x0E: { mnemonic: 'ASL', mode: 'absolute', bytes: 3 },
  0x1E: { mnemonic: 'ASL', mode: 'absoluteX', bytes: 3 },

  // BCC, BCS, BEQ, BMI, BNE, BPL, BVC, BVS
  0x90: { mnemonic: 'BCC', mode: 'relative', bytes: 2 },
  0xB0: { mnemonic: 'BCS', mode: 'relative', bytes: 2 },
  0xF0: { mnemonic: 'BEQ', mode: 'relative', bytes: 2 },
  0x30: { mnemonic: 'BMI', mode: 'relative', bytes: 2 },
  0xD0: { mnemonic: 'BNE', mode: 'relative', bytes: 2 },
  0x10: { mnemonic: 'BPL', mode: 'relative', bytes: 2 },
  0x50: { mnemonic: 'BVC', mode: 'relative', bytes: 2 },
  0x70: { mnemonic: 'BVS', mode: 'relative', bytes: 2 },

  // BIT
  0x24: { mnemonic: 'BIT', mode: 'zeroPage', bytes: 2 },
  0x2C: { mnemonic: 'BIT', mode: 'absolute', bytes: 3 },

  // BRK
  0x00: { mnemonic: 'BRK', mode: 'implied', bytes: 1 },

  // CLC, CLD, CLI, CLV
  0x18: { mnemonic: 'CLC', mode: 'implied', bytes: 1 },
  0xD8: { mnemonic: 'CLD', mode: 'implied', bytes: 1 },
  0x58: { mnemonic: 'CLI', mode: 'implied', bytes: 1 },
  0xB8: { mnemonic: 'CLV', mode: 'implied', bytes: 1 },

  // CMP
  0xC9: { mnemonic: 'CMP', mode: 'immediate', bytes: 2 },
  0xC5: { mnemonic: 'CMP', mode: 'zeroPage', bytes: 2 },
  0xD5: { mnemonic: 'CMP', mode: 'zeroPageX', bytes: 2 },
  0xCD: { mnemonic: 'CMP', mode: 'absolute', bytes: 3 },
  0xDD: { mnemonic: 'CMP', mode: 'absoluteX', bytes: 3 },
  0xD9: { mnemonic: 'CMP', mode: 'absoluteY', bytes: 3 },
  0xC1: { mnemonic: 'CMP', mode: 'indexedIndirect', bytes: 2 },
  0xD1: { mnemonic: 'CMP', mode: 'indirectIndexed', bytes: 2 },

  // CPX
  0xE0: { mnemonic: 'CPX', mode: 'immediate', bytes: 2 },
  0xE4: { mnemonic: 'CPX', mode: 'zeroPage', bytes: 2 },
  0xEC: { mnemonic: 'CPX', mode: 'absolute', bytes: 3 },

  // CPY
  0xC0: { mnemonic: 'CPY', mode: 'immediate', bytes: 2 },
  0xC4: { mnemonic: 'CPY', mode: 'zeroPage', bytes: 2 },
  0xCC: { mnemonic: 'CPY', mode: 'absolute', bytes: 3 },

  // DEC
  0xC6: { mnemonic: 'DEC', mode: 'zeroPage', bytes: 2 },
  0xD6: { mnemonic: 'DEC', mode: 'zeroPageX', bytes: 2 },
  0xCE: { mnemonic: 'DEC', mode: 'absolute', bytes: 3 },
  0xDE: { mnemonic: 'DEC', mode: 'absoluteX', bytes: 3 },

  // DEX, DEY
  0xCA: { mnemonic: 'DEX', mode: 'implied', bytes: 1 },
  0x88: { mnemonic: 'DEY', mode: 'implied', bytes: 1 },

  // EOR
  0x49: { mnemonic: 'EOR', mode: 'immediate', bytes: 2 },
  0x45: { mnemonic: 'EOR', mode: 'zeroPage', bytes: 2 },
  0x55: { mnemonic: 'EOR', mode: 'zeroPageX', bytes: 2 },
  0x4D: { mnemonic: 'EOR', mode: 'absolute', bytes: 3 },
  0x5D: { mnemonic: 'EOR', mode: 'absoluteX', bytes: 3 },
  0x59: { mnemonic: 'EOR', mode: 'absoluteY', bytes: 3 },
  0x41: { mnemonic: 'EOR', mode: 'indexedIndirect', bytes: 2 },
  0x51: { mnemonic: 'EOR', mode: 'indirectIndexed', bytes: 2 },

  // INC
  0xE6: { mnemonic: 'INC', mode: 'zeroPage', bytes: 2 },
  0xF6: { mnemonic: 'INC', mode: 'zeroPageX', bytes: 2 },
  0xEE: { mnemonic: 'INC', mode: 'absolute', bytes: 3 },
  0xFE: { mnemonic: 'INC', mode: 'absoluteX', bytes: 3 },

  // INX, INY
  0xE8: { mnemonic: 'INX', mode: 'implied', bytes: 1 },
  0xC8: { mnemonic: 'INY', mode: 'implied', bytes: 1 },

  // JMP
  0x4C: { mnemonic: 'JMP', mode: 'absolute', bytes: 3 },
  0x6C: { mnemonic: 'JMP', mode: 'indirect', bytes: 3 },

  // JSR
  0x20: { mnemonic: 'JSR', mode: 'absolute', bytes: 3 },

  // LDA
  0xA9: { mnemonic: 'LDA', mode: 'immediate', bytes: 2 },
  0xA5: { mnemonic: 'LDA', mode: 'zeroPage', bytes: 2 },
  0xB5: { mnemonic: 'LDA', mode: 'zeroPageX', bytes: 2 },
  0xAD: { mnemonic: 'LDA', mode: 'absolute', bytes: 3 },
  0xBD: { mnemonic: 'LDA', mode: 'absoluteX', bytes: 3 },
  0xB9: { mnemonic: 'LDA', mode: 'absoluteY', bytes: 3 },
  0xA1: { mnemonic: 'LDA', mode: 'indexedIndirect', bytes: 2 },
  0xB1: { mnemonic: 'LDA', mode: 'indirectIndexed', bytes: 2 },

  // LDX
  0xA2: { mnemonic: 'LDX', mode: 'immediate', bytes: 2 },
  0xA6: { mnemonic: 'LDX', mode: 'zeroPage', bytes: 2 },
  0xB6: { mnemonic: 'LDX', mode: 'zeroPageY', bytes: 2 },
  0xAE: { mnemonic: 'LDX', mode: 'absolute', bytes: 3 },
  0xBE: { mnemonic: 'LDX', mode: 'absoluteY', bytes: 3 },

  // LDY
  0xA0: { mnemonic: 'LDY', mode: 'immediate', bytes: 2 },
  0xA4: { mnemonic: 'LDY', mode: 'zeroPage', bytes: 2 },
  0xB4: { mnemonic: 'LDY', mode: 'zeroPageX', bytes: 2 },
  0xAC: { mnemonic: 'LDY', mode: 'absolute', bytes: 3 },
  0xBC: { mnemonic: 'LDY', mode: 'absoluteX', bytes: 3 },

  // LSR
  0x4A: { mnemonic: 'LSR', mode: 'accumulator', bytes: 1 },
  0x46: { mnemonic: 'LSR', mode: 'zeroPage', bytes: 2 },
  0x56: { mnemonic: 'LSR', mode: 'zeroPageX', bytes: 2 },
  0x4E: { mnemonic: 'LSR', mode: 'absolute', bytes: 3 },
  0x5E: { mnemonic: 'LSR', mode: 'absoluteX', bytes: 3 },

  // NOP
  0xEA: { mnemonic: 'NOP', mode: 'implied', bytes: 1 },

  // ORA
  0x09: { mnemonic: 'ORA', mode: 'immediate', bytes: 2 },
  0x05: { mnemonic: 'ORA', mode: 'zeroPage', bytes: 2 },
  0x15: { mnemonic: 'ORA', mode: 'zeroPageX', bytes: 2 },
  0x0D: { mnemonic: 'ORA', mode: 'absolute', bytes: 3 },
  0x1D: { mnemonic: 'ORA', mode: 'absoluteX', bytes: 3 },
  0x19: { mnemonic: 'ORA', mode: 'absoluteY', bytes: 3 },
  0x01: { mnemonic: 'ORA', mode: 'indexedIndirect', bytes: 2 },
  0x11: { mnemonic: 'ORA', mode: 'indirectIndexed', bytes: 2 },

  // PHA, PHP, PLA, PLP
  0x48: { mnemonic: 'PHA', mode: 'implied', bytes: 1 },
  0x08: { mnemonic: 'PHP', mode: 'implied', bytes: 1 },
  0x68: { mnemonic: 'PLA', mode: 'implied', bytes: 1 },
  0x28: { mnemonic: 'PLP', mode: 'implied', bytes: 1 },

  // ROL
  0x2A: { mnemonic: 'ROL', mode: 'accumulator', bytes: 1 },
  0x26: { mnemonic: 'ROL', mode: 'zeroPage', bytes: 2 },
  0x36: { mnemonic: 'ROL', mode: 'zeroPageX', bytes: 2 },
  0x2E: { mnemonic: 'ROL', mode: 'absolute', bytes: 3 },
  0x3E: { mnemonic: 'ROL', mode: 'absoluteX', bytes: 3 },

  // ROR
  0x6A: { mnemonic: 'ROR', mode: 'accumulator', bytes: 1 },
  0x66: { mnemonic: 'ROR', mode: 'zeroPage', bytes: 2 },
  0x76: { mnemonic: 'ROR', mode: 'zeroPageX', bytes: 2 },
  0x6E: { mnemonic: 'ROR', mode: 'absolute', bytes: 3 },
  0x7E: { mnemonic: 'ROR', mode: 'absoluteX', bytes: 3 },

  // RTI, RTS
  0x40: { mnemonic: 'RTI', mode: 'implied', bytes: 1 },
  0x60: { mnemonic: 'RTS', mode: 'implied', bytes: 1 },

  // SBC
  0xE9: { mnemonic: 'SBC', mode: 'immediate', bytes: 2 },
  0xE5: { mnemonic: 'SBC', mode: 'zeroPage', bytes: 2 },
  0xF5: { mnemonic: 'SBC', mode: 'zeroPageX', bytes: 2 },
  0xED: { mnemonic: 'SBC', mode: 'absolute', bytes: 3 },
  0xFD: { mnemonic: 'SBC', mode: 'absoluteX', bytes: 3 },
  0xF9: { mnemonic: 'SBC', mode: 'absoluteY', bytes: 3 },
  0xE1: { mnemonic: 'SBC', mode: 'indexedIndirect', bytes: 2 },
  0xF1: { mnemonic: 'SBC', mode: 'indirectIndexed', bytes: 2 },

  // SEC, SED, SEI
  0x38: { mnemonic: 'SEC', mode: 'implied', bytes: 1 },
  0xF8: { mnemonic: 'SED', mode: 'implied', bytes: 1 },
  0x78: { mnemonic: 'SEI', mode: 'implied', bytes: 1 },

  // STA
  0x85: { mnemonic: 'STA', mode: 'zeroPage', bytes: 2 },
  0x95: { mnemonic: 'STA', mode: 'zeroPageX', bytes: 2 },
  0x8D: { mnemonic: 'STA', mode: 'absolute', bytes: 3 },
  0x9D: { mnemonic: 'STA', mode: 'absoluteX', bytes: 3 },
  0x99: { mnemonic: 'STA', mode: 'absoluteY', bytes: 3 },
  0x81: { mnemonic: 'STA', mode: 'indexedIndirect', bytes: 2 },
  0x91: { mnemonic: 'STA', mode: 'indirectIndexed', bytes: 2 },

  // STX
  0x86: { mnemonic: 'STX', mode: 'zeroPage', bytes: 2 },
  0x96: { mnemonic: 'STX', mode: 'zeroPageY', bytes: 2 },
  0x8E: { mnemonic: 'STX', mode: 'absolute', bytes: 3 },

  // STY
  0x84: { mnemonic: 'STY', mode: 'zeroPage', bytes: 2 },
  0x94: { mnemonic: 'STY', mode: 'zeroPageX', bytes: 2 },
  0x8C: { mnemonic: 'STY', mode: 'absolute', bytes: 3 },

  // TAX, TAY, TSX, TXA, TXS, TYA
  0xAA: { mnemonic: 'TAX', mode: 'implied', bytes: 1 },
  0xA8: { mnemonic: 'TAY', mode: 'implied', bytes: 1 },
  0xBA: { mnemonic: 'TSX', mode: 'implied', bytes: 1 },
  0x8A: { mnemonic: 'TXA', mode: 'implied', bytes: 1 },
  0x9A: { mnemonic: 'TXS', mode: 'implied', bytes: 1 },
  0x98: { mnemonic: 'TYA', mode: 'implied', bytes: 1 },
};

export interface DisassembledLine {
  address: number;
  bytes: number[];
  mnemonic: string;
  operand: string;
  isCurrentPC: boolean;
}

export function disassemble(
  memory: number[],
  startAddr: number,
  currentPC: number,
  lineCount: number = 16
): DisassembledLine[] {
  const lines: DisassembledLine[] = [];
  let offset = 0;

  while (lines.length < lineCount && offset < memory.length) {
    const addr = startAddr + offset;
    const opcode = memory[offset];
    const info = OPCODES[opcode];

    if (!info) {
      // Unknown opcode
      lines.push({
        address: addr,
        bytes: [opcode],
        mnemonic: '???',
        operand: '',
        isCurrentPC: addr === currentPC,
      });
      offset += 1;
      continue;
    }

    const operandBytes = memory.slice(offset + 1, offset + info.bytes);
    const operand = formatOperand(info.mode, operandBytes);

    lines.push({
      address: addr,
      bytes: [opcode, ...operandBytes],
      mnemonic: info.mnemonic,
      operand,
      isCurrentPC: addr === currentPC,
    });

    offset += info.bytes;
  }

  return lines;
}
