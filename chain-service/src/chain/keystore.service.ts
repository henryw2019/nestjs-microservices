import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type KeyRecord = {
  ownerId: string;
  address: string;
  privateKey: string;
};

@Injectable()
export class KeyStoreService {
  private keys: KeyRecord[] = [];
  private filePath: string;

  constructor() {
    const p = process.env.KEYSTORE_PATH || path.join(process.cwd(), 'keys.json');
    this.filePath = p;
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        this.keys = JSON.parse(raw) as KeyRecord[];
      } else {
        // initialize empty file
        fs.writeFileSync(p, '[]', { encoding: 'utf8' });
        this.keys = [];
      }
    } catch (e) {
      // ignore and keep empty
      this.keys = [];
    }
  }

  // Get a private key for a given ownerId and address. Returns undefined if not found.
  getPrivateKeyForOwnerAddress(ownerId: string, address: string): string | undefined {
    const rec = this.keys.find(k => k.ownerId === ownerId && k.address.toLowerCase() === address.toLowerCase());
    return rec?.privateKey;
  }

  // Get a private key by address regardless owner (internal admin use)
  getPrivateKeyByAddress(address: string): string | undefined {
    const rec = this.keys.find(k => k.address.toLowerCase() === address.toLowerCase());
    return rec?.privateKey;
  }

  // For demo/testing only: add a key record and persist
  addKeyRecord(record: KeyRecord) {
    this.keys.push(record);
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.keys, null, 2), 'utf8');
    } catch (e) {
      // ignore
    }
  }
}
