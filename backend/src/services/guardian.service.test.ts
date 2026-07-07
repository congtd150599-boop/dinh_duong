import type { GuardianRecord } from '@dinhduong/shared';
import { describe, expect, it } from 'vitest';
import { hasQualifyingGuardian } from './guardian.service';

function guardian(overrides: Partial<GuardianRecord> = {}): GuardianRecord {
  return {
    id: 'g1',
    relationship: 'Mẹ',
    name: 'Test',
    dob: null,
    address: null,
    email: null,
    phone: null,
    ...overrides,
  };
}

describe('hasQualifyingGuardian', () => {
  it('empty array → false', () => {
    expect(hasQualifyingGuardian([])).toBe(false);
  });

  it('one guardian with only email (no phone) → false', () => {
    expect(hasQualifyingGuardian([guardian({ email: 'a@test.local' })])).toBe(false);
  });

  it('one guardian with only phone (no email) → false', () => {
    expect(hasQualifyingGuardian([guardian({ phone: '0900000000' })])).toBe(false);
  });

  it('one guardian with both email and phone → true', () => {
    expect(hasQualifyingGuardian([guardian({ email: 'a@test.local', phone: '0900000000' })])).toBe(true);
  });

  it('two guardians, only the second qualifies → true', () => {
    const guardians = [
      guardian({ id: 'g1', relationship: 'Bố', email: 'bo@test.local' }),
      guardian({ id: 'g2', relationship: 'Mẹ', email: 'me@test.local', phone: '0900000000' }),
    ];
    expect(hasQualifyingGuardian(guardians)).toBe(true);
  });

  it('two guardians, neither qualifies → false', () => {
    const guardians = [
      guardian({ id: 'g1', relationship: 'Bố', email: 'bo@test.local' }),
      guardian({ id: 'g2', relationship: 'Mẹ', phone: '0900000000' }),
    ];
    expect(hasQualifyingGuardian(guardians)).toBe(false);
  });
});
