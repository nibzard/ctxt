import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ConversionForm from '../ConversionForm';

// Mock the API service
vi.mock('../../services/api', () => ({
  convertUrl: vi.fn(),
}));

import { convertUrl } from '../../services/api';

describe('ConversionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders conversion form with input and button', () => {
    render(<ConversionForm />);
    
    expect(screen.getByPlaceholderText(/paste any url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convert/i })).toBeInTheDocument();
  });

  test('button is disabled when input is empty', () => {
    render(<ConversionForm />);
    
    const button = screen.getByRole('button', { name: /convert/i });
    expect(button).toBeDisabled();
  });

  test('button is enabled when input has value', () => {
    render(<ConversionForm />);
    
    const input = screen.getByPlaceholderText(/paste any url/i);
    const button = screen.getByRole('button', { name: /convert/i });
    
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    expect(button).toBeEnabled();
  });

  test('shows loading state during conversion', async () => {
    const mockConvertUrl = convertUrl as vi.MockedFunction<typeof convertUrl>;
    mockConvertUrl.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ConversionForm />);
    
    const input = screen.getByPlaceholderText(/paste any url/i);
    const button = screen.getByRole('button', { name: /convert/i });
    
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);
    
    expect(screen.getByText(/converting/i)).toBeInTheDocument();
    expect(button).toBeDisabled();
    expect(input).toBeDisabled();
  });

  test('handles successful conversion', async () => {
    const mockResponse = {
      title: 'Test Article',
      content: '# Test Article\n\nThis is test content.',
      slug: 'test-article',
      permanent_url: 'https://ctxt.help/read/test-article',
    };

    const mockConvertUrl = convertUrl as vi.MockedFunction<typeof convertUrl>;
    mockConvertUrl.mockResolvedValue(mockResponse);

    const onSuccess = vi.fn();
    render(<ConversionForm onSuccess={onSuccess} />);
    
    const input = screen.getByPlaceholderText(/paste any url/i);
    const button = screen.getByRole('button', { name: /convert/i });
    
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  test('handles conversion error', async () => {
    const mockConvertUrl = convertUrl as vi.MockedFunction<typeof convertUrl>;
    mockConvertUrl.mockRejectedValue(new Error('Conversion failed'));

    render(<ConversionForm />);
    
    const input = screen.getByPlaceholderText(/paste any url/i);
    const button = screen.getByRole('button', { name: /convert/i });
    
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/conversion failed/i)).toBeInTheDocument();
    });
  });

  test('clears error when user types new URL', async () => {
    const mockConvertUrl = convertUrl as vi.MockedFunction<typeof convertUrl>;
    mockConvertUrl.mockRejectedValue(new Error('Conversion failed'));

    render(<ConversionForm />);
    
    const input = screen.getByPlaceholderText(/paste any url/i);
    const button = screen.getByRole('button', { name: /convert/i });
    
    // Trigger error
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/conversion failed/i)).toBeInTheDocument();
    });

    // Clear error by typing
    fireEvent.change(input, { target: { value: 'https://newexample.com' } });
    
    expect(screen.queryByText(/conversion failed/i)).not.toBeInTheDocument();
  });

  test('validates URL format', () => {
    render(<ConversionForm />);
    
    const input = screen.getByPlaceholderText(/paste any url/i);
    const button = screen.getByRole('button', { name: /convert/i });
    
    // Invalid URL
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.click(button);
    
    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
  });
});