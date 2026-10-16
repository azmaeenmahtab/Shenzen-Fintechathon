import type { ClientSession } from 'mongoose';
import type {
  NormalizedTransactionRow,
  NormalizedInvoiceRow,
} from '@harbor/contracts';
import { ValidationError } from '../../core/http/app-error';
import { accountsRepository } from '../accounts';
import { counterpartiesRepository } from '../counterparties';
import { ledgerRepository, type UpsertLedgerEntryData } from '../ledger';
import { invoicesRepository, type UpsertInvoiceData } from '../invoices';

export async function persistCommittedTransactions(
  tenantId: string,
  importId: string,
  stagedRows: NormalizedTransactionRow[],
  session: ClientSession,
): Promise<void> {
  const uniqueAccountCodes = Array.from(new Set(stagedRows.map((r) => r.accountCode)));
  for (const code of uniqueAccountCodes) {
    const account = await accountsRepository.findByCode(tenantId, code, session);
    if (!account) {
      if (code === 'OPERATING') {
        await accountsRepository.ensureAccount(tenantId, 'OPERATING', session);
      } else {
        throw new ValidationError(`Referenced account "${code}" does not exist`);
      }
    }
  }

  const ledgerItems: UpsertLedgerEntryData[] = stagedRows.map((row) => ({
    accountCode: row.accountCode,
    externalId: row.externalId,
    bookedOn: row.bookedOn,
    amountMinor: row.amountMinor,
    currency: 'CNY',
    category: row.category,
    description: row.description,
    counterpartyExternalId: undefined,
    kind: 'imported',
    sourceImportId: importId,
  }));

  await ledgerRepository.bulkUpsert(tenantId, ledgerItems, session);
}

export async function persistCommittedInvoices(
  tenantId: string,
  importId: string,
  stagedRows: NormalizedInvoiceRow[],
  session: ClientSession,
): Promise<void> {
  const seenCounterparties = new Map<string, 'customer' | 'vendor'>();
  for (const row of stagedRows) {
    if (!seenCounterparties.has(row.counterpartyExternalId)) {
      seenCounterparties.set(
        row.counterpartyExternalId,
        row.direction === 'AR' ? 'customer' : 'vendor',
      );
    }
  }

  for (const [externalId, type] of seenCounterparties.entries()) {
    await counterpartiesRepository.ensureCounterparty(
      tenantId,
      externalId,
      type,
      undefined,
      session,
    );
  }

  const invoiceItems: UpsertInvoiceData[] = stagedRows.map((row) => ({
    externalId: row.externalId,
    direction: row.direction,
    counterpartyExternalId: row.counterpartyExternalId,
    totalMinor: row.totalMinor,
    outstandingMinor: row.outstandingMinor,
    currency: 'CNY',
    dueOn: row.dueOn,
    expectedSettlementOn: row.expectedSettlementOn,
    status: row.status,
    sourceImportId: importId,
  }));

  await invoicesRepository.bulkUpsert(tenantId, invoiceItems, session);
}
