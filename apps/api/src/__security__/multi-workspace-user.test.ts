import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { useTestDb } from '../core/db/test/mongo-test-harness';
import { setupTestAuth, issueTestToken, seedTestMember } from '../test-utils/test-auth-helper';
import { AccountModel } from '../features/accounts';
import { InvoiceModel } from '../features/invoices';
import { AlertModel } from '../features/alerts';
import { CommitmentModel } from '../features/commitments';
import { ActionProposal } from '../features/actions/actions.models';
import { tenantsRepository } from '../features/tenants';
import { eventsBus } from '../features/events/events.bus';
import type { EventDto } from '@harbor/contracts';

describe('B18 Security Suite: Multi-Workspace Isolation for Same User (rohan@work.com)', () => {
  useTestDb();
  const app = createApp();

  const dragonTenantId = 'tenant_dragon_electronics';
  const jadeTenantId = 'tenant_jade_textiles';
  const rohanUserId = 'usr_rohan_multi_owner';

  let rohanToken: string;
  let dragonInvoiceId: string;
  let dragonAlertId: string;

  beforeAll(async () => {
    await setupTestAuth();
  });

  beforeEach(async () => {
    // 1. Single user (rohan@work.com) is owner of BOTH workspaces
    await seedTestMember(dragonTenantId, rohanUserId, 'owner');
    await seedTestMember(jadeTenantId, rohanUserId, 'owner');
    rohanToken = await issueTestToken(rohanUserId);

    await tenantsRepository.upsertDefaults(dragonTenantId);
    await tenantsRepository.upsertDefaults(jadeTenantId);

    // 2. Dragon Electronics domain records
    await AccountModel.create({
      tenantId: dragonTenantId, code: 'OPERATING', name: 'Dragon Operating Account',
      currency: 'CNY', openingBalanceMinor: 15_000_000, openingBalanceDate: '2026-10-20',
    });
    const dragonInv = await InvoiceModel.create({
      tenantId: dragonTenantId, externalId: 'DRAGON-INV-001', direction: 'AR',
      counterpartyExternalId: 'cp_dragon_retailer', totalMinor: 3_500_000, outstandingMinor: 3_500_000,
      currency: 'CNY', dueOn: '2026-10-31', expectedSettlementOn: '2026-10-31', status: 'open',
    });
    dragonInvoiceId = String(dragonInv._id);

    const dragonAlt = await AlertModel.create({
      tenantId: dragonTenantId, ruleId: 'floor_breach', severity: 'high', status: 'open',
      title: 'Dragon Liquidity Floor Warning', summary: 'Liquidity dip forecast on day 15',
      fingerprint: 'fp_dragon_1', firstSeenAt: new Date(), lastSeenAt: new Date(),
    });
    dragonAlertId = String(dragonAlt._id);

    await CommitmentModel.create({
      tenantId: dragonTenantId, label: 'Dragon Factory Lease', direction: 'outflow',
      category: 'operating_expense', amountMinor: 1_200_000, frequency: 'monthly', anchorOn: '2026-11-01',
    });
    await ActionProposal.create({
      tenantId: dragonTenantId, proposerId: rohanUserId, source: 'user', status: 'pending',
      actionType: 'sandbox_financing_draw', payloadHash: 'hash_dragon_1', baseInputVersion: 1,
      canonicalPayload: { offerCode: 'dragon-revolver', principalMinor: 5_000_000 },
      expiresAt: new Date(Date.now() + 86400000),
    });

    // 3. Jade Textiles domain records
    await AccountModel.create({
      tenantId: jadeTenantId, code: 'OPERATING', name: 'Jade Operating Account',
      currency: 'CNY', openingBalanceMinor: 5_000_000, openingBalanceDate: '2026-10-20',
    });
    await InvoiceModel.create({
      tenantId: jadeTenantId, externalId: 'JADE-INV-001', direction: 'AR',
      counterpartyExternalId: 'cp_jade_fashion', totalMinor: 800_000, outstandingMinor: 800_000,
      currency: 'CNY', dueOn: '2026-11-05', expectedSettlementOn: '2026-11-05', status: 'open',
    });
    await AlertModel.create({
      tenantId: jadeTenantId, ruleId: 'overdue_receivable', severity: 'medium', status: 'open',
      title: 'Jade Overdue Receivable', summary: 'Fashion House payment delayed',
      fingerprint: 'fp_jade_1', firstSeenAt: new Date(), lastSeenAt: new Date(),
    });
    await CommitmentModel.create({
      tenantId: jadeTenantId, label: 'Jade Looms Maintenance', direction: 'outflow',
      category: 'operating_expense', amountMinor: 300_000, frequency: 'monthly', anchorOn: '2026-12-01',
    });
  });

  describe('Feature-by-Feature Workspace Scoping', () => {
    it('isolates accounts between Dragon and Jade for the same authenticated user', async () => {
      const dragonRes = await request(app).get('/api/v1/accounts')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', dragonTenantId);
      expect(dragonRes.status).toBe(200);
      expect(dragonRes.body.data[0].name).toBe('Dragon Operating Account');

      const jadeRes = await request(app).get('/api/v1/accounts')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(jadeRes.status).toBe(200);
      expect(jadeRes.body.data[0].name).toBe('Jade Operating Account');
    });

    it('isolates invoices and returns 404 for cross-workspace resource lookup', async () => {
      const dragonList = await request(app).get('/api/v1/invoices')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', dragonTenantId);
      expect(dragonList.body.data[0].externalId).toBe('DRAGON-INV-001');

      const jadeList = await request(app).get('/api/v1/invoices')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(jadeList.body.data[0].externalId).toBe('JADE-INV-001');

      // User owns Dragon, but when querying with Jade workspace header, Dragon invoice must return 404
      const crossLookup = await request(app).get(`/api/v1/invoices/${dragonInvoiceId}`)
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(crossLookup.status).toBe(404);
      expect(crossLookup.body.error?.code).toBe('NOT_FOUND');
    });

    it('isolates alerts between Dragon and Jade', async () => {
      const dragonAlerts = await request(app).get('/api/v1/alerts')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', dragonTenantId);
      expect(dragonAlerts.body.data[0].title).toBe('Dragon Liquidity Floor Warning');

      const jadeAlerts = await request(app).get('/api/v1/alerts')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(jadeAlerts.body.data[0].title).toBe('Jade Overdue Receivable');

      const crossAlert = await request(app).get(`/api/v1/alerts/${dragonAlertId}`)
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(crossAlert.status).toBe(404);
    });

    it('isolates commitments between Dragon and Jade', async () => {
      const dragonRes = await request(app).get('/api/v1/commitments')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', dragonTenantId);
      expect(dragonRes.body.data[0].label).toBe('Dragon Factory Lease');

      const jadeRes = await request(app).get('/api/v1/commitments')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(jadeRes.body.data[0].label).toBe('Jade Looms Maintenance');
    });

    it('isolates action proposals between Dragon and Jade', async () => {
      const dragonProposals = await request(app).get('/api/v1/action-proposals')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', dragonTenantId);
      expect(dragonProposals.body.data[0].canonicalPayload.offerCode).toBe('dragon-revolver');

      const jadeProposals = await request(app).get('/api/v1/action-proposals')
        .set('Authorization', `Bearer ${rohanToken}`).set('X-Tenant-Id', jadeTenantId);
      expect(jadeProposals.body.data).toHaveLength(0);
    });

    it('prevents cross-workspace event leaking on SSE bus for the same user', async () => {
      let jadeReceivedEvents = 0;
      const unsubscribeJade = eventsBus.onTenantEvent(jadeTenantId, () => {
        jadeReceivedEvents += 1;
      });

      const dragonEvent: EventDto = {
        id: 'evt_dragon_1',
        tenantId: dragonTenantId,
        sequence: 1,
        kind: 'forecast.updated',
        publicSummary: 'Dragon forecast updated',
        resourceRefs: ['forecast:latest'],
        createdAt: new Date().toISOString(),
      };
      eventsBus.emitEvent(dragonEvent);
      unsubscribeJade();
      expect(jadeReceivedEvents).toBe(0);
    });
  });
});
