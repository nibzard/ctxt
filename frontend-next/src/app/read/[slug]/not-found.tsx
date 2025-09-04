// ABOUTME: Custom 404 page for conversion routes with helpful messaging
// ABOUTME: Provides better user experience when conversions are not found

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Conversion Not Found</h2>
          <p className="text-gray-600 mb-6">
            The requested conversion could not be found. This might happen if:
          </p>
          
          <ul className="text-left text-gray-600 mb-8 space-y-2">
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              The link is incorrect or expired
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              The backend service is temporarily unavailable
            </li>
            <li className="flex items-start">
              <span className="text-red-500 mr-2">•</span>
              The content was removed
            </li>
          </ul>
        </div>
        
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
          
          <p className="text-sm text-gray-500">
            Or try refreshing the page if the service was temporarily down
          </p>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Powered by <Link href="/" className="text-blue-600 hover:underline">ctxt.help</Link> - The LLM Context Builder
          </p>
        </div>
      </div>
    </div>
  );
}