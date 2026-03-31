import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock @tanstack/react-query
const mockInvalidateQueries = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// Mock api
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { ChatWidget } from './ChatWidget';

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render floating chat button', () => {
    render(<ChatWidget />);
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument();
  });

  it('should open chat panel when button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByText('ผู้ช่วย Timesheet')).toBeInTheDocument();
  });

  it('should display welcome message', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByText(/สวัสดีค่ะ/)).toBeInTheDocument();
  });

  it('should show suggested actions in welcome message', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByText('แสดง Timesheet สัปดาห์นี้')).toBeInTheDocument();
  });

  it('should close chat panel when X button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));
    expect(screen.getByText('ผู้ช่วย Timesheet')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close chat'));
    expect(screen.queryByText('ผู้ช่วย Timesheet')).not.toBeInTheDocument();
  });

  it('should send message when form is submitted', async () => {
    mockPost.mockResolvedValueOnce({ type: 'message', text: 'response text' });

    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));

    const input = screen.getByPlaceholderText('พิมพ์ข้อความ...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/integrations/teams/message', { text: 'Hello' });
    });

    await waitFor(() => {
      expect(screen.getByText('response text')).toBeInTheDocument();
    });
  });

  it('should show error message on API failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));

    const input = screen.getByPlaceholderText('พิมพ์ข้อความ...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งค่ะ')).toBeInTheDocument();
    });
  });

  it('should invalidate queries when response contains success keyword', async () => {
    mockPost.mockResolvedValueOnce({ type: 'message', text: 'Logged เรียบร้อย' });

    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));

    const input = screen.getByPlaceholderText('พิมพ์ข้อความ...');
    fireEvent.change(input, { target: { value: 'กรอก 4 ชม.' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['timesheet'] });
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  it('should disable send button when input is empty', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByLabelText('Open chat'));

    const sendButton = screen.getByLabelText('Send message');
    expect(sendButton).toBeDisabled();
  });
});
