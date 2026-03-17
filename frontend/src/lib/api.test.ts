import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock sonner before importing api
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token-123' } },
        error: null,
      }),
    },
  })),
}));

// Import after mocks are set up
import { api } from './api';
import { toast } from 'sonner';

// Helper to mock fetch responses
function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    headers: new Headers(headers),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  return response;
}

describe('api.ts — request function', () => {
  let originalWindowLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Save original location and replace with mock
    originalWindowLocation = window.location;
    // @ts-expect-error jsdom does not allow direct assignment
    delete window.location;
    window.location = { href: '/' } as Location;
  });

  afterEach(() => {
    window.location = originalWindowLocation;
    vi.unstubAllGlobals();
  });

  describe('successful requests', () => {
    it('should resolve with parsed JSON on a 200 response', async () => {
      const payload = { id: 'ts-1', status: 'draft' };
      mockFetch(200, payload);

      const result = await api.get('/timesheets/current');
      expect(result).toEqual(payload);
    });

    it('should send GET request without body', async () => {
      mockFetch(200, []);
      await api.get('/users');

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchArgs[1].method).toBeUndefined(); // GET is default
    });

    it('should send POST request with serialized JSON body', async () => {
      const body = { period_start: '2026-03-09', period_end: '2026-03-15' };
      mockFetch(201, { id: 'ts-new' });

      await api.post('/timesheets', body);

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchArgs[1].method).toBe('POST');
      expect(fetchArgs[1].body).toBe(JSON.stringify(body));
    });

    it('should send PUT request with serialized JSON body', async () => {
      const body = { fullName: 'Updated Name' };
      mockFetch(200, { id: 'u1', fullName: 'Updated Name' });

      await api.put('/users/me', body);

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchArgs[1].method).toBe('PUT');
      expect(fetchArgs[1].body).toBe(JSON.stringify(body));
    });

    it('should send DELETE request', async () => {
      mockFetch(200, { deleted: true });

      await api.delete('/cost-rates/1');

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchArgs[1].method).toBe('DELETE');
    });

    it('should include Authorization Bearer header when session exists', async () => {
      mockFetch(200, {});

      await api.get('/users/me');

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchArgs[1].headers['Authorization']).toBe('Bearer mock-token-123');
    });

    it('should include Content-Type: application/json header', async () => {
      mockFetch(200, {});

      await api.get('/users/me');

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(fetchArgs[1].headers['Content-Type']).toBe('application/json');
    });
  });

  describe('401 Unauthorized — session expired flow', () => {
    it('should call toast.error with session expired message on 401', async () => {
      mockFetch(401, { message: 'Unauthorized' });

      await expect(api.get('/timesheets')).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('Session expired. Redirecting to login...');
    });

    it('should redirect window.location.href to /login on 401', async () => {
      mockFetch(401, { message: 'Unauthorized' });

      await expect(api.get('/timesheets')).rejects.toThrow();
      expect(window.location.href).toBe('/login');
    });

    it('should throw an error with the response message on 401', async () => {
      mockFetch(401, { message: 'Unauthorized' });

      await expect(api.get('/timesheets')).rejects.toThrow('Unauthorized');
    });
  });

  describe('non-401 errors — toast and re-throw', () => {
    it('should call toast.error with the error message on 400', async () => {
      mockFetch(400, { message: 'Bad request: missing period_start' });

      await expect(api.post('/timesheets', {})).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('Bad request: missing period_start');
    });

    it('should call toast.error with the error message on 403', async () => {
      mockFetch(403, { message: 'Forbidden' });

      await expect(api.get('/admin/users')).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('Forbidden');
    });

    it('should call toast.error with the error message on 404', async () => {
      mockFetch(404, { message: 'User not found' });

      await expect(api.get('/users/nonexistent')).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('User not found');
    });

    it('should call toast.error with the error message on 500', async () => {
      mockFetch(500, { message: 'Internal server error' });

      await expect(api.get('/reports/chargeability')).rejects.toThrow();
      expect(toast.error).toHaveBeenCalledWith('Internal server error');
    });

    it('should NOT redirect to /login on non-401 errors', async () => {
      mockFetch(500, { message: 'Internal server error' });

      await expect(api.get('/reports')).rejects.toThrow();
      expect(window.location.href).not.toBe('/login');
    });

    it('should throw error with message from response body', async () => {
      mockFetch(422, { message: 'Validation failed: hours must be a number' });

      await expect(api.post('/timesheets/ts-1/entries', { hours: 'abc' })).rejects.toThrow(
        'Validation failed: hours must be a number'
      );
    });
  });

  describe('error — malformed or unparseable response body', () => {
    it('should fallback to "Request failed" when response body is not valid JSON', async () => {
      const response = {
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

      await expect(api.get('/reports')).rejects.toThrow('Request failed');
      expect(toast.error).toHaveBeenCalledWith('Request failed');
    });

    it('should fallback to "HTTP 503" when response body has no message field', async () => {
      mockFetch(503, { code: 'SERVICE_UNAVAILABLE' });

      await expect(api.get('/health')).rejects.toThrow('HTTP 503');
      expect(toast.error).toHaveBeenCalledWith('HTTP 503');
    });
  });

  describe('API URL construction', () => {
    it('should prepend API_URL and /api/v1 to the path', async () => {
      mockFetch(200, {});

      await api.get('/users/me');

      const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const calledUrl = fetchArgs[0] as string;
      expect(calledUrl).toMatch(/\/api\/v1\/users\/me$/);
    });
  });
});

describe('api.ts — session without token', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should not include Authorization header when session is null', async () => {
    // Override the createClient mock to return null session for this test
    const { createClient } = await import('@/lib/supabase/client');
    (createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    });

    const response = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([]),
      text: vi.fn().mockResolvedValue('[]'),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    await api.get('/public/holidays');

    const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchArgs[1].headers['Authorization']).toBeUndefined();
  });
});
