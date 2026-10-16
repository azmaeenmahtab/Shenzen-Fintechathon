import type { ClientSession } from 'mongoose';
import type { AccountDto } from '@harbor/contracts';
import { AccountModel, type AccountDoc } from './accounts.model';

function toDto(doc: AccountDoc): AccountDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    code: doc.code,
    name: doc.name,
    currency: 'CNY',
    openingBalanceMinor: doc.openingBalanceMinor,
    openingBalanceDate: doc.openingBalanceDate,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface UpsertAccountData {
  code: string;
  name: string;
  currency?: 'CNY';
  openingBalanceMinor: number;
  openingBalanceDate: string;
}

export const accountsRepository = {
  async findByCode(
    tenantId: string,
    code: string,
    session?: ClientSession,
  ): Promise<AccountDto | null> {
    const doc = await AccountModel.findOne({ tenantId, code })
      .session(session ?? null)
      .lean();
    return doc ? toDto(doc as unknown as AccountDoc) : null;
  },

  async list(tenantId: string, session?: ClientSession): Promise<AccountDto[]> {
    const docs = await AccountModel.find({ tenantId })
      .sort({ code: 1 })
      .session(session ?? null)
      .lean();
    return docs.map((doc) => toDto(doc as unknown as AccountDoc));
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertAccountData[],
    session?: ClientSession,
  ): Promise<void> {
    if (items.length === 0) return;

    const ops = items.map((item) => ({
      updateOne: {
        filter: { tenantId, code: item.code },
        update: {
          $set: {
            name: item.name,
            currency: item.currency ?? 'CNY',
            openingBalanceMinor: item.openingBalanceMinor,
            openingBalanceDate: item.openingBalanceDate,
          },
          $setOnInsert: { tenantId, code: item.code },
        },
        upsert: true,
      },
    }));

    await AccountModel.bulkWrite(ops, { session });
  },

  async create(
    tenantId: string,
    data: UpsertAccountData,
    session?: ClientSession,
  ): Promise<AccountDto> {
    const docs = await AccountModel.create(
      [
        {
          tenantId,
          code: data.code,
          name: data.name,
          currency: data.currency ?? 'CNY',
          openingBalanceMinor: data.openingBalanceMinor,
          openingBalanceDate: data.openingBalanceDate,
        },
      ],
      { session },
    );
    return toDto(docs[0] as unknown as AccountDoc);
  },

  async ensureAccount(
    tenantId: string,
    code: string,
    session?: ClientSession,
  ): Promise<AccountDto> {
    const existing = await this.findByCode(tenantId, code, session);
    if (existing) {
      return existing;
    }
    const name = code === 'OPERATING' ? 'Main Operating Account' : `Account ${code}`;
    return this.create(
      tenantId,
      {
        code,
        name,
        currency: 'CNY',
        openingBalanceMinor: 0,
        openingBalanceDate: '2026-01-01',
      },
      session,
    );
  },
};

