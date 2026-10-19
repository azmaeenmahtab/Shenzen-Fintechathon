import { describe, it, expect, beforeEach } from 'vitest';
import { DEMO_EMAILS, DEMO_TENANTS } from '@harbor/contracts';
import { seedAuth } from '../../../../scripts/seed-auth';
import { testMemoryDb } from '../server/auth';

describe('seed-auth script (S02)', () => {
  beforeEach(() => {
    // Clear in-memory collections before tests
    for (const key of Object.keys(testMemoryDb)) {
      testMemoryDb[key] = [];
    }
  });

  it('creates demo users, organizations, and team members with correct roles', async () => {
    const result = await seedAuth({ password: 'TestPassword123!' });

    // 1. Verify 13 demo users
    expect(result.users).toHaveLength(13);
    expect(result.users.every((u) => u.created)).toBe(true);

    const harborOwner = result.users.find((u) => u.email === DEMO_EMAILS.HARBOR_OWNER);
    const harborEmployee = result.users.find((u) => u.email === DEMO_EMAILS.HARBOR_EMPLOYEE);
    const harborReviewer = result.users.find((u) => u.email === DEMO_EMAILS.HARBOR_REVIEWER);
    const pearlOwner = result.users.find((u) => u.email === DEMO_EMAILS.PEARL_OWNER);
    const rohanOwner = result.users.find((u) => u.email === DEMO_EMAILS.ROHAN_OWNER);

    expect(harborOwner).toBeDefined();
    expect(harborEmployee).toBeDefined();
    expect(harborReviewer).toBeDefined();
    expect(pearlOwner).toBeDefined();
    expect(rohanOwner).toBeDefined();

    // 2. Verify 4 organizations
    expect(result.organizations).toHaveLength(4);
    expect(result.organizations.every((o) => o.created)).toBe(true);

    const harborOrg = result.organizations.find((o) => o.slug === DEMO_TENANTS.HARBOR_WHOLESALE);
    const pearlOrg = result.organizations.find((o) => o.slug === DEMO_TENANTS.PEARL_BAKERY);
    const dragonOrg = result.organizations.find((o) => o.slug === DEMO_TENANTS.DRAGON_ELECTRONICS);
    const jadeOrg = result.organizations.find((o) => o.slug === DEMO_TENANTS.JADE_TEXTILES);

    expect(harborOrg).toBeDefined();
    expect(harborOrg?.name).toBe('Harbor Wholesale');
    expect(pearlOrg).toBeDefined();
    expect(pearlOrg?.name).toBe('Pearl Bakery');
    expect(dragonOrg).toBeDefined();
    expect(dragonOrg?.name).toBe('Dragon Electronics');
    expect(jadeOrg).toBeDefined();
    expect(jadeOrg?.name).toBe('Jade Textiles');

    // 3. Verify Harbor memberships
    const harborMembers = result.members.filter((m) => m.organizationId === harborOrg?.id);
    expect(harborMembers).toHaveLength(3);

    const ownerMember = harborMembers.find((m) => m.userId === harborOwner?.id);
    const employeeMember = harborMembers.find((m) => m.userId === harborEmployee?.id);
    const reviewerMember = harborMembers.find((m) => m.userId === harborReviewer?.id);

    expect(ownerMember?.role).toBe('owner');
    expect(employeeMember?.role).toBe('employee');
    expect(reviewerMember?.role).toBe('reviewer');

    // 4. Verify Pearl membership
    const pearlMembers = result.members.filter((m) => m.organizationId === pearlOrg?.id);
    expect(pearlMembers).toHaveLength(1);
    expect(pearlMembers[0]?.userId).toBe(pearlOwner?.id);
    expect(pearlMembers[0]?.role).toBe('owner');

    // 5. Verify Dragon memberships
    const dragonMembers = result.members.filter((m) => m.organizationId === dragonOrg?.id);
    expect(dragonMembers).toHaveLength(4);

    // 6. Verify Jade memberships
    const jadeMembers = result.members.filter((m) => m.organizationId === jadeOrg?.id);
    expect(jadeMembers).toHaveLength(4);
  });

  it('is strictly idempotent: second run changes nothing (created: false for all)', async () => {
    // First run
    const firstRun = await seedAuth({ password: 'TestPassword123!' });
    expect(firstRun.users.filter((u) => u.created)).toHaveLength(13);
    expect(firstRun.organizations.filter((o) => o.created)).toHaveLength(4);
    // 10 members created directly by seed (Harbor employee+reviewer, 4 Dragon, 4 Jade; 2 owners auto-created by org creation)
    expect(firstRun.members.filter((m) => m.created)).toHaveLength(10);

    // Second run
    const secondRun = await seedAuth({ password: 'TestPassword123!' });

    expect(secondRun.users).toHaveLength(13);
    expect(secondRun.users.every((u) => !u.created)).toBe(true);

    expect(secondRun.organizations).toHaveLength(4);
    expect(secondRun.organizations.every((o) => !o.created)).toBe(true);

    expect(secondRun.members).toHaveLength(12);
    expect(secondRun.members.every((m) => !m.created)).toBe(true);

    // Verify IDs remain identical
    expect(secondRun.users.map((u) => u.id)).toEqual(firstRun.users.map((u) => u.id));
    expect(secondRun.organizations.map((o) => o.id)).toEqual(firstRun.organizations.map((o) => o.id));
  });
});
