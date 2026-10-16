import type { ClientSession } from 'mongoose';
import type { AccountDto } from '@harbor/contracts';
import { accountsRepository, type UpsertAccountData } from './accounts.repository';

export const accountsService = {
  async list(tenantId: string, session?: ClientSession): Promise<AccountDto[]> {
    return accountsRepository.list(tenantId, session);
  },

  async getByCode(
    tenantId: string,
    code: string,
    session?: ClientSession,
  ): Promise<AccountDto | null> {
    return accountsRepository.findByCode(tenantId, code, session);
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertAccountData[],
    session?: ClientSession,
  ): Promise<void> {
    return accountsRepository.bulkUpsert(tenantId, items, session);
  },

  async create(
    tenantId: string,
    data: UpsertAccountData,
    session?: ClientSession,
  ): Promise<AccountDto> {
    return accountsRepository.create(tenantId, data, session);
  },

  async ensureAccount(
    tenantId: string,
    code: string,
    session?: ClientSession,
  ): Promise<AccountDto> {
    return accountsRepository.ensureAccount(tenantId, code, session);
  },
};

