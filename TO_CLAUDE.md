Excellent, thank you for providing the actual link. That reveals a much more clever and efficient implementation than the standard text-scraping method.

You are correct. The browser is **not sending the page's text** to Claude. Instead, it's sending a **command** to Claude, telling it to fetch the content of the page on its own.

Let's break down the link you provided:

**`https://claude.ai/new?q=Read%20from%20https%3A%2F%2Fdocs.anthropic.com%2Fen%2Fdocs%2Fclaude-code%2Fsub-agents.md%20so%20I%20can%20ask%20questions%20about%20it.`**

When we URL-decode the part after `?q=`, we see the actual prompt being sent:

**`"Read from https://docs.anthropic.com/en/docs/claude-code/sub-agents.md so I can ask questions about it."`**

This changes the process entirely. Here is how it actually works:

### The "Command via URL" Implementation

The functionality is still driven by JavaScript, but it's much simpler and more powerful.

**Step 1: The Click Event**

A JavaScript event listener is attached to the "Open in Claude" element, waiting for a click. This part remains the same as the previous explanation.

```javascript
const openInClaudeButton = document.getElementById('page-context-menu-button');
openInClaudeButton.addEventListener('click', sendURLToClaude);
```

**Step 2: The JavaScript Function (`sendURLToClaude`)**

When the button is clicked, this function executes a very simple set of instructions:

1.  **Get the Current Page URL:** It grabs the URL of the page you are currently viewing.
2.  **Construct a Prompt:** It inserts that URL into a pre-written sentence, forming a direct command for Claude.
3.  **Build the Final URL:** It takes this command, URL-encodes it, and appends it to the `https://claude.ai/new?q=` URL.

Here is what the JavaScript for this process would look like:

```javascript
function sendURLToClaude() {
  // 1. Get the URL of the current page.
  // Using location.href is the most direct way.
  const currentPageURL = window.location.href;

  // 2. Create the command prompt for Claude.
  const promptText = `Read from ${currentPageURL} so I can ask questions about it.`;

  // 3. URL-encode the entire prompt to make it safe for a URL.
  const encodedPrompt = encodeURIComponent(promptText);

  // 4. Construct the final URL.
  const claudeURL = `https://claude.ai/new?q=${encodedPrompt}`;

  // 5. Open this URL in a new tab.
  window.open(claudeURL, '_blank');
}
```

### Why This Method is Smarter

This approach is superior to scraping and sending the text for several key reasons:

1.  **Simplicity & Robustness:** The client-side JavaScript is tiny and straightforward. It doesn't need to parse the page's HTML, which can be complex and break easily if the website's design changes. It only needs one piece of information: the current URL.
2.  **Efficiency:** Instead of creating an extremely long URL by stuffing the entire page's content into it, it sends a very short and clean URL. This is faster and avoids potential length limits on URLs.
3.  **Richer Context for Claude:** When Claude receives a URL, its own backend systems can fetch the page. This is far more powerful than a simple text scrape because Claude can:
    *   **Understand the HTML structure:** It can differentiate between headings, paragraphs, code blocks, and tables, leading to a much better understanding of the content.
    *   **Access Metadata:** It can read the page's title, description, and other metadata that isn't visible in the main text.
    *   **Handle Complex Content:** If the page contains complex elements like interactive diagrams or embedded content, Claude's sophisticated processing can often make sense of them in a way that a simple text copy cannot.