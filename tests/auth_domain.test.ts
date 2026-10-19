import { describe, it, expect } from 'vitest';
import { isDomainAllowed, parseJwtPayload, verifyGoogleToken } from '../server/index';

describe('Google Corporate Domain Restriction (@google.com)', () => {
  it('allows verified corporate google.com email accounts', () => {
    expect(isDomainAllowed('aosterloh@google.com')).toBe(true);
    expect(isDomainAllowed('sundar@google.com')).toBe(true);
    expect(isDomainAllowed('ANYBODY@GOOGLE.COM')).toBe(true);
  });

  it('allows valid Google Workspace hd claim', () => {
    expect(isDomainAllowed('user@custom.net', 'google.com')).toBe(true);
  });

  it('blocks personal consumer Gmail accounts', () => {
    expect(isDomainAllowed('john.doe@gmail.com')).toBe(false);
    expect(isDomainAllowed('test@googlemail.com')).toBe(false);
  });

  it('blocks external or spoofed domains', () => {
    expect(isDomainAllowed('attacker@notgoogle.com')).toBe(false);
    expect(isDomainAllowed('attacker@google.com.evil.com')).toBe(false);
    expect(isDomainAllowed('attacker@fakegoogle.com')).toBe(false);
    expect(isDomainAllowed('user@cloudspace.goog')).toBe(false);
    expect(isDomainAllowed('user@yahoo.com')).toBe(false);
    expect(isDomainAllowed('')).toBe(false);
    expect(isDomainAllowed(undefined, undefined)).toBe(false);
  });

  it('parses JWT payload safely', () => {
    const samplePayload = {
      iss: 'https://securetoken.google.com/aosterloh-cs-muc',
      aud: 'aosterloh-cs-muc',
      email: 'aosterloh@google.com',
      email_verified: true,
    };
    const b64 = Buffer.from(JSON.stringify(samplePayload)).toString('base64url');
    const fakeJwt = `header.${b64}.signature`;

    const parsed = parseJwtPayload(fakeJwt);
    expect(parsed).toEqual(samplePayload);
    expect(parsed.iss).toContain('securetoken.google.com');
  });

  it('rejects malformed token strings', async () => {
    const result = await verifyGoogleToken('invalid.token.payload');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
