function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-center mb-8">ctxt.help</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl mb-4">Convert URLs to Clean Markdown</h2>
          <p className="text-gray-600 mb-4">
            Transform any webpage into clean, readable markdown with permanent links.
          </p>
          <form className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL
              </label>
              <input
                type="url"
                id="url"
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Convert to Markdown
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;