import { renderHook, act } from '@testing-library/react'
import { useClipboard } from '../useClipboard'

// Mock navigator.clipboard
const mockClipboard = {
  writeText: jest.fn(),
}

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
})

// Mock document.execCommand for fallback
const mockExecCommand = jest.fn()
Object.defineProperty(document, 'execCommand', {
  value: mockExecCommand,
  writable: true,
})

describe('useClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('initializes with copied as false', () => {
    const { result } = renderHook(() => useClipboard())
    
    expect(result.current.copied).toBe(false)
    expect(typeof result.current.copy).toBe('function')
  })

  it('successfully copies text using navigator.clipboard', async () => {
    mockClipboard.writeText.mockResolvedValueOnce(undefined)
    
    const { result } = renderHook(() => useClipboard())
    
    let copyResult: boolean
    await act(async () => {
      copyResult = await result.current.copy('test text')
    })
    
    expect(mockClipboard.writeText).toHaveBeenCalledWith('test text')
    expect(copyResult!).toBe(true)
    expect(result.current.copied).toBe(true)
  })

  it('resets copied state after 2 seconds', async () => {
    mockClipboard.writeText.mockResolvedValueOnce(undefined)
    
    const { result } = renderHook(() => useClipboard())
    
    await act(async () => {
      await result.current.copy('test text')
    })
    
    expect(result.current.copied).toBe(true)
    
    // Fast forward 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    
    expect(result.current.copied).toBe(false)
  })

  it('falls back to execCommand when clipboard API fails', async () => {
    mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard API not available'))
    mockExecCommand.mockReturnValueOnce(true)
    
    // Mock document.createElement and related methods
    const mockTextArea = {
      value: '',
      select: jest.fn(),
    }
    const mockAppendChild = jest.fn()
    const mockRemoveChild = jest.fn()
    
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockTextArea as any)
    jest.spyOn(document.body, 'appendChild').mockImplementationOnce(mockAppendChild)
    jest.spyOn(document.body, 'removeChild').mockImplementationOnce(mockRemoveChild)
    
    const { result } = renderHook(() => useClipboard())
    
    let copyResult: boolean
    await act(async () => {
      copyResult = await result.current.copy('test text')
    })
    
    expect(mockClipboard.writeText).toHaveBeenCalledWith('test text')
    expect(document.createElement).toHaveBeenCalledWith('textarea')
    expect(mockTextArea.value).toBe('test text')
    expect(mockTextArea.select).toHaveBeenCalled()
    expect(mockExecCommand).toHaveBeenCalledWith('copy')
    expect(mockAppendChild).toHaveBeenCalledWith(mockTextArea)
    expect(mockRemoveChild).toHaveBeenCalledWith(mockTextArea)
    expect(copyResult!).toBe(true)
    expect(result.current.copied).toBe(true)
  })

  it('returns false when fallback execCommand fails', async () => {
    mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard API not available'))
    mockExecCommand.mockReturnValueOnce(false)
    
    // Mock document.createElement and related methods
    const mockTextArea = {
      value: '',
      select: jest.fn(),
    }
    const mockAppendChild = jest.fn()
    const mockRemoveChild = jest.fn()
    
    jest.spyOn(document, 'createElement').mockReturnValueOnce(mockTextArea as any)
    jest.spyOn(document.body, 'appendChild').mockImplementationOnce(mockAppendChild)
    jest.spyOn(document.body, 'removeChild').mockImplementationOnce(mockRemoveChild)
    
    const { result } = renderHook(() => useClipboard())
    
    let copyResult: boolean
    await act(async () => {
      copyResult = await result.current.copy('test text')
    })
    
    expect(copyResult!).toBe(false)
    expect(result.current.copied).toBe(false)
  })

  it('handles multiple copy operations correctly', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)
    
    const { result } = renderHook(() => useClipboard())
    
    // First copy
    await act(async () => {
      await result.current.copy('first text')
    })
    expect(result.current.copied).toBe(true)
    
    // Second copy before timeout
    await act(async () => {
      await result.current.copy('second text')
    })
    expect(result.current.copied).toBe(true)
    
    // Fast forward 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    
    expect(result.current.copied).toBe(false)
  })
})