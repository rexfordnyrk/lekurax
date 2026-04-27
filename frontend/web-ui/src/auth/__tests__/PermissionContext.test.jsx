import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider, usePermissions } from '../PermissionContext.jsx';
import { authzkit } from '../authzkitClient.js';

vi.mock('../authzkitClient.js', () => ({
  authzkit: {
    isAuthenticated: true,
    users: {
      getMyPermissions: vi.fn(),
    },
  },
}));

const Consumer = () => {
  const { hasPermission, loading } = usePermissions();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="can-list">{hasPermission('users.list') ? 'yes' : 'no'}</span>
    </div>
  );
};

describe('PermissionProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzkit.isAuthenticated = true;
  });

  it('exposes hasPermission after fetch', async () => {
    authzkit.users.getMyPermissions.mockResolvedValue({
      permissions: ['users.list'],
      roles: ['admin'],
    });

    render(
      <MemoryRouter>
        <PermissionProvider>
          <Consumer />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('can-list')).toHaveTextContent('yes');
    });
  });

  it('returns false for permissions not in list', async () => {
    authzkit.users.getMyPermissions.mockResolvedValue({
      permissions: [],
      roles: [],
    });

    render(
      <MemoryRouter>
        <PermissionProvider>
          <Consumer />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('can-list')).toHaveTextContent('no');
    });
  });

  it('handles fetch errors gracefully', async () => {
    authzkit.users.getMyPermissions.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <PermissionProvider>
          <Consumer />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('can-list')).toHaveTextContent('no');
    });
  });
});
