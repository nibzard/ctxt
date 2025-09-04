import axios from 'axios'
import { apiService } from '../api'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('apiService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock axios.create to return the mocked axios instance
    mockedAxios.create = jest.fn(() => mockedAxios)
  })

  describe('validateUrl', () => {
    it('returns true for valid HTTP URLs', () => {
      expect(apiService.validateUrl('http://example.com')).toBe(true)
      expect(apiService.validateUrl('https://example.com')).toBe(true)
      expect(apiService.validateUrl('https://www.example.com/path')).toBe(true)
    })

    it('returns false for invalid URLs', () => {
      expect(apiService.validateUrl('')).toBe(false)
      expect(apiService.validateUrl('not-a-url')).toBe(false)
      expect(apiService.validateUrl('ftp://example.com')).toBe(false)
      expect(apiService.validateUrl('javascript:alert(1)')).toBe(false)
    })

    it('returns false for non-string inputs', () => {
      expect(apiService.validateUrl(null as any)).toBe(false)
      expect(apiService.validateUrl(undefined as any)).toBe(false)
      expect(apiService.validateUrl(123 as any)).toBe(false)
    })
  })

  describe('getSEOPageUrl', () => {
    const originalWindow = window

    beforeEach(() => {
      // Mock window.location
      delete (window as any).location
      window.location = {
        ...originalWindow.location,
        origin: 'https://ctxt.help',
      }
    })

    afterEach(() => {
      window.location = originalWindow.location
    })

    it('constructs SEO page URL correctly', () => {
      const slug = 'test-article-slug'
      const result = apiService.getSEOPageUrl(slug)
      expect(result).toBe('https://ctxt.help/read/test-article-slug')
    })

    it('handles empty slug', () => {
      const result = apiService.getSEOPageUrl('')
      expect(result).toBe('https://ctxt.help/read/')
    })
  })

  describe('convertUrl', () => {
    it('makes POST request to conversion endpoint', async () => {
      const mockResponse = {
        data: {
          id: '123',
          slug: 'test-slug',
          title: 'Test Article',
          content: 'Test content',
        }
      }
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      const result = await apiService.convertUrl('https://example.com')

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/conversions/convert', {
        url: 'https://example.com',
        options: undefined
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('passes conversion options when provided', async () => {
      const mockResponse = {
        data: {
          id: '123',
          slug: 'test-slug',
          title: 'Test Article',
          content: 'Test content',
        }
      }
      
      const options = { includeImages: true, maxLength: 5000 }
      mockedAxios.post.mockResolvedValueOnce(mockResponse)

      await apiService.convertUrl('https://example.com', options)

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/conversions/convert', {
        url: 'https://example.com',
        options
      })
    })

    it('throws error when request fails', async () => {
      const mockError = new Error('Network error')
      mockedAxios.post.mockRejectedValueOnce(mockError)

      await expect(apiService.convertUrl('https://example.com')).rejects.toThrow('Network error')
    })
  })

  describe('getConversions', () => {
    it('makes GET request to conversions endpoint', async () => {
      const mockResponse = {
        data: {
          items: [
            { id: '1', title: 'Article 1' },
            { id: '2', title: 'Article 2' },
          ],
          total: 2,
          page: 1,
          size: 20
        }
      }
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await apiService.getConversions()

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/conversions', {
        params: {}
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('passes query parameters when provided', async () => {
      const mockResponse = {
        data: {
          items: [],
          total: 0,
          page: 1,
          size: 10
        }
      }
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      await apiService.getConversions({ 
        page: 2, 
        size: 10, 
        search: 'test' 
      })

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/conversions', {
        params: {
          page: 2,
          size: 10,
          search: 'test'
        }
      })
    })
  })

  describe('getConversion', () => {
    it('makes GET request to specific conversion endpoint', async () => {
      const mockResponse = {
        data: {
          id: '123',
          slug: 'test-slug',
          title: 'Test Article',
          content: 'Test content',
        }
      }
      
      mockedAxios.get.mockResolvedValueOnce(mockResponse)

      const result = await apiService.getConversion('test-slug')

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/conversions/test-slug')
      expect(result).toEqual(mockResponse.data)
    })

    it('throws error when conversion not found', async () => {
      const mockError = { response: { status: 404 } }
      mockedAxios.get.mockRejectedValueOnce(mockError)

      await expect(apiService.getConversion('non-existent')).rejects.toEqual(mockError)
    })
  })
})