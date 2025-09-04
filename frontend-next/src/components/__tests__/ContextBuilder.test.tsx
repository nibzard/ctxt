import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContextBuilder from '../ContextBuilder'

// Mock localStorage for batch import testing
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock document.hidden for visibility change testing
Object.defineProperty(document, 'hidden', {
  value: false,
  writable: true,
})

describe('ContextBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    
    // Mock document.addEventListener and removeEventListener
    jest.spyOn(document, 'addEventListener')
    jest.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders with initial empty state', () => {
    render(<ContextBuilder initialBlocks={[]} />)
    
    expect(screen.getByPlaceholderText(/stack name/i)).toBeInTheDocument()
    expect(screen.getByText(/add your first item/i)).toBeInTheDocument()
  })

  it('renders with initial blocks', () => {
    const initialBlocks = [
      {
        id: '1',
        type: 'conversion' as const,
        title: 'Test Conversion',
        content: 'Test content',
        url: 'https://example.com',
        slug: 'test-slug',
        tokens: 100,
        domain: 'example.com',
        timestamp: new Date().toISOString(),
      }
    ]

    render(<ContextBuilder initialBlocks={initialBlocks} />)
    
    expect(screen.getByText('Test Conversion')).toBeInTheDocument()
    expect(screen.getByText(/example\.com/)).toBeInTheDocument()
  })

  it('allows adding a new text block', async () => {
    const user = userEvent.setup()
    render(<ContextBuilder initialBlocks={[]} />)
    
    const addButton = screen.getByRole('button', { name: /add text block/i })
    await user.click(addButton)
    
    expect(screen.getByPlaceholderText(/enter your text/i)).toBeInTheDocument()
  })

  it('updates stack name when input changes', async () => {
    const user = userEvent.setup()
    render(<ContextBuilder initialBlocks={[]} />)
    
    const nameInput = screen.getByPlaceholderText(/stack name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'My Test Stack')
    
    expect(nameInput).toHaveValue('My Test Stack')
  })

  it('saves draft to localStorage when blocks change', async () => {
    const user = userEvent.setup()
    render(<ContextBuilder initialBlocks={[]} />)
    
    const nameInput = screen.getByPlaceholderText(/stack name/i)
    await user.type(nameInput, 'Test Stack')
    
    // Wait for the useEffect to trigger
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'contextBuilderDraft',
        expect.stringContaining('Test Stack')
      )
    })
  })

  it('loads draft from localStorage on mount', () => {
    const draftData = {
      blocks: [
        {
          id: '1',
          type: 'text',
          title: 'Draft Text',
          content: 'Draft content',
          tokens: 50,
          timestamp: new Date().toISOString(),
        }
      ],
      stackName: 'Draft Stack',
      savedAt: new Date().toISOString(),
    }

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'contextBuilderDraft') {
        return JSON.stringify(draftData)
      }
      return null
    })

    render(<ContextBuilder initialBlocks={[]} />)
    
    expect(screen.getByDisplayValue('Draft Stack')).toBeInTheDocument()
    expect(screen.getByText('Draft Text')).toBeInTheDocument()
  })

  it('sets up visibility change event listener', () => {
    render(<ContextBuilder initialBlocks={[]} />)
    
    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    )
  })

  it('cleans up event listener on unmount', () => {
    const { unmount } = render(<ContextBuilder initialBlocks={[]} />)
    
    unmount()
    
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    )
  })

  it('shows token count when blocks are present', () => {
    const initialBlocks = [
      {
        id: '1',
        type: 'conversion' as const,
        title: 'Test Conversion',
        content: 'Test content',
        url: 'https://example.com',
        slug: 'test-slug',
        tokens: 100,
        domain: 'example.com',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'text' as const,
        title: 'Test Text',
        content: 'Test text content',
        tokens: 50,
        timestamp: new Date().toISOString(),
      }
    ]

    render(<ContextBuilder initialBlocks={initialBlocks} />)
    
    // Should show total tokens (100 + 50 = 150)
    expect(screen.getByText(/150 tokens/i)).toBeInTheDocument()
  })

  it('removes block when delete button is clicked', async () => {
    const user = userEvent.setup()
    const initialBlocks = [
      {
        id: '1',
        type: 'text' as const,
        title: 'Test Text',
        content: 'Test content',
        tokens: 100,
        timestamp: new Date().toISOString(),
      }
    ]

    render(<ContextBuilder initialBlocks={initialBlocks} />)
    
    expect(screen.getByText('Test Text')).toBeInTheDocument()
    
    const deleteButton = screen.getByTitle(/remove block/i)
    await user.click(deleteButton)
    
    expect(screen.queryByText('Test Text')).not.toBeInTheDocument()
  })

  it('handles batch import check from localStorage', () => {
    const batchImportData = [
      {
        url: 'https://example.com',
        success: true,
        result: {
          id: '1',
          slug: 'test-slug',
          title: 'Test Article',
          content: 'Test content',
          domain: 'example.com',
        }
      }
    ]

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'batchImport') {
        return JSON.stringify(batchImportData)
      }
      return null
    })

    render(<ContextBuilder initialBlocks={[]} />)
    
    // The component should process the batch import
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('batchImport')
  })
})