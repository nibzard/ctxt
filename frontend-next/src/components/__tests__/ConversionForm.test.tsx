import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConversionForm from '../ConversionForm'

// Mock the hooks
jest.mock('@/hooks', () => ({
  useConversion: jest.fn(() => ({
    conversion: null,
    loading: false,
    error: null,
    convertUrl: jest.fn(),
    clearError: jest.fn(),
    isFromCache: false,
    cacheAgeHours: null,
  })),
  useClipboard: jest.fn(() => ({
    copy: jest.fn(),
    copied: false,
  })),
}))

// Mock the API service
jest.mock('@/services/api', () => ({
  apiService: {
    validateUrl: jest.fn(),
    getSEOPageUrl: jest.fn(),
  },
}))

describe('ConversionForm', () => {
  const mockUseConversion = require('@/hooks').useConversion
  const mockUseClipboard = require('@/hooks').useClipboard
  const mockApiService = require('@/services/api').apiService

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseConversion.mockReturnValue({
      conversion: null,
      loading: false,
      error: null,
      convertUrl: jest.fn(),
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })
    
    mockUseClipboard.mockReturnValue({
      copy: jest.fn(),
      copied: false,
    })
    
    mockApiService.validateUrl.mockReturnValue(true)
    mockApiService.getSEOPageUrl.mockReturnValue('https://example.com/page/test-slug')
  })

  it('renders the conversion form', () => {
    render(<ConversionForm />)
    
    expect(screen.getByPlaceholderText(/enter any url to convert/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /convert/i })).toBeInTheDocument()
  })

  it('allows switching between single and batch modes', async () => {
    const user = userEvent.setup()
    render(<ConversionForm />)
    
    // Should start in single mode
    expect(screen.getByPlaceholderText(/enter any url to convert/i)).toBeInTheDocument()
    
    // Switch to batch mode
    const batchTab = screen.getByRole('button', { name: /batch/i })
    await user.click(batchTab)
    
    expect(screen.getByPlaceholderText(/enter multiple urls/i)).toBeInTheDocument()
  })

  it('calls convertUrl when form is submitted with valid URL', async () => {
    const mockConvertUrl = jest.fn()
    mockUseConversion.mockReturnValue({
      conversion: null,
      loading: false,
      error: null,
      convertUrl: mockConvertUrl,
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })

    const user = userEvent.setup()
    render(<ConversionForm />)
    
    const input = screen.getByPlaceholderText(/enter any url to convert/i)
    const submitButton = screen.getByRole('button', { name: /convert/i })
    
    await user.type(input, 'https://example.com')
    await user.click(submitButton)
    
    expect(mockConvertUrl).toHaveBeenCalledWith('https://example.com')
  })

  it('does not call convertUrl when URL is invalid', async () => {
    const mockConvertUrl = jest.fn()
    mockUseConversion.mockReturnValue({
      conversion: null,
      loading: false,
      error: null,
      convertUrl: mockConvertUrl,
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })

    mockApiService.validateUrl.mockReturnValue(false)

    const user = userEvent.setup()
    render(<ConversionForm />)
    
    const input = screen.getByPlaceholderText(/enter any url to convert/i)
    const submitButton = screen.getByRole('button', { name: /convert/i })
    
    await user.type(input, 'invalid-url')
    await user.click(submitButton)
    
    expect(mockConvertUrl).not.toHaveBeenCalled()
  })

  it('displays loading state when converting', () => {
    mockUseConversion.mockReturnValue({
      conversion: null,
      loading: true,
      error: null,
      convertUrl: jest.fn(),
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })

    render(<ConversionForm />)
    
    expect(screen.getByText(/converting/i)).toBeInTheDocument()
  })

  it('displays error message when conversion fails', () => {
    mockUseConversion.mockReturnValue({
      conversion: null,
      loading: false,
      error: 'Failed to convert URL',
      convertUrl: jest.fn(),
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })

    render(<ConversionForm />)
    
    expect(screen.getByText(/failed to convert url/i)).toBeInTheDocument()
  })

  it('displays conversion result when successful', () => {
    const mockConversion = {
      id: '123',
      slug: 'test-slug',
      title: 'Test Article',
      content: 'This is test content',
      domain: 'example.com',
      source_url: 'https://example.com/article',
      word_count: 100,
      reading_time: 5,
      created_at: '2025-01-01T12:00:00Z'
    }

    mockUseConversion.mockReturnValue({
      conversion: mockConversion,
      loading: false,
      error: null,
      convertUrl: jest.fn(),
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })

    render(<ConversionForm />)
    
    expect(screen.getByText('Test Article')).toBeInTheDocument()
    expect(screen.getByText(/example\.com/)).toBeInTheDocument()
    expect(screen.getByText(/100 words/)).toBeInTheDocument()
  })

  it('calls copy function when copy button is clicked', async () => {
    const mockCopy = jest.fn()
    const mockConversion = {
      id: '123',
      slug: 'test-slug',
      title: 'Test Article',
      content: 'This is test content',
      domain: 'example.com',
      source_url: 'https://example.com/article',
      word_count: 100,
      reading_time: 5,
      created_at: '2025-01-01T12:00:00Z'
    }

    mockUseConversion.mockReturnValue({
      conversion: mockConversion,
      loading: false,
      error: null,
      convertUrl: jest.fn(),
      clearError: jest.fn(),
      isFromCache: false,
      cacheAgeHours: null,
    })

    mockUseClipboard.mockReturnValue({
      copy: mockCopy,
      copied: false,
    })

    const user = userEvent.setup()
    render(<ConversionForm />)
    
    const copyButton = screen.getByTitle(/copy link/i)
    await user.click(copyButton)
    
    expect(mockCopy).toHaveBeenCalledWith('https://example.com/page/test-slug')
  })
})