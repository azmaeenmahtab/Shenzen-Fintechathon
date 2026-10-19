import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useActiveCompany } from '../hooks/use-active-company';
import { getActiveTenantId } from '@/lib/api/client';
import type * as AuthModule from '@/features/auth';
import { authClient, clearApiToken } from '@/features/auth';

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthModule>();
  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      useActiveOrganization: vi.fn(),
      useListOrganizations: vi.fn(),
      useActiveMemberRole: vi.fn(),
      organization: {
        setActive: vi.fn(),
        list: vi.fn(),
      },
    },
    clearApiToken: vi.fn(),
  };
});

describe('Multi-Workspace Tenant Isolation (rohan@work.com owning Dragon & Jade)', () => {
  let queryClient: QueryClient;

  const dragonOrg = {
    id: 'org_dragon_123',
    name: 'Dragon Electronics',
    slug: 'dragon-electronics',
  };

  const jadeOrg = {
    id: 'org_jade_456',
    name: 'Jade Textiles',
    slug: 'jade-textiles',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    queryClient = new QueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('maintains strict isolation and purges query cache when rohan switches between Dragon and Jade', async () => {
    // 1. Initial State: Rohan is viewing Dragon Electronics
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: dragonOrg,
      isPending: false,
    } as never);
    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [dragonOrg, jadeOrg],
      isPending: false,
    } as never);
    vi.mocked(authClient.useActiveMemberRole).mockReturnValue({
      data: { role: 'owner' },
      isPending: false,
    } as never);
    vi.mocked(authClient.organization.setActive).mockResolvedValue({
      data: { id: jadeOrg.id },
      error: null,
    } as never);

    const { result, rerender } = renderHook(() => useActiveCompany(), { wrapper });

    // Verify initial Dragon workspace state
    expect(result.current.activeCompany?.name).toBe('Dragon Electronics');
    expect(result.current.companies).toHaveLength(2);
    expect(getActiveTenantId()).toBe(dragonOrg.id);
    expect(sessionStorage.getItem('harbor_active_tenant_id')).toBe(dragonOrg.id);

    // 2. Simulate query cache populated with Dragon Electronics financial data
    queryClient.setQueryData(['invoices', dragonOrg.id], [
      { id: 'inv_dragon_1', amountMinor: 3_500_000, desc: 'Semiconductors' },
    ]);
    queryClient.setQueryData(['forecast', dragonOrg.id], {
      openingCashMinor: 15_000_000,
    });
    expect(queryClient.getQueryData(['invoices', dragonOrg.id])).toBeDefined();

    // 3. User switches to Jade Textiles
    await act(async () => {
      await result.current.setActiveCompany(jadeOrg.id);
    });

    // 4. Verify that setActiveCompany invoked Better Auth and synchronized state
    expect(authClient.organization.setActive).toHaveBeenCalledWith({
      organizationId: jadeOrg.id,
    });
    expect(clearApiToken).toHaveBeenCalled();

    // Verify tenant ID immediately transitioned
    expect(getActiveTenantId()).toBe(jadeOrg.id);
    expect(sessionStorage.getItem('harbor_active_tenant_id')).toBe(jadeOrg.id);

    // 5. Assert TanStack Query cache was purged: Dragon's data is completely gone
    expect(queryClient.getQueryData(['invoices', dragonOrg.id])).toBeUndefined();
    expect(queryClient.getQueryData(['forecast', dragonOrg.id])).toBeUndefined();

    // 6. Simulate auth client updating active organization to Jade
    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: jadeOrg,
      isPending: false,
    } as never);
    rerender();

    expect(result.current.activeCompany?.name).toBe('Jade Textiles');
    expect(result.current.activeCompany?.id).toBe(jadeOrg.id);
  });
});
