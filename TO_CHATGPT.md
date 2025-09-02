# Deep-linking into ChatGPT from a browser URL bar

ChatGPT does support a simple URL query-string format—very similar to Claude’s `…/new?q=` pattern—that lets you open a brand-new chat with an initial prompt already filled in.

## Format

```
https://chatgpt.com/?q=<url-encoded prompt>
```

-  Replace `<url-encoded prompt>` with any text that has been URL-encoded (spaces become `%20`, etc.).
-  When you visit that address, ChatGPT opens a fresh conversation and drops your decoded text into the message composer, ready to send (or it may auto-send if your settings/extension does so).

Example
Typing this into your browser’s address bar…

```
https://chatgpt.com/?q=Summarize%20the%20key%20ideas%20in%20Einstein%27s%201905%20paper%20on%20special%20relativity
```

…launches ChatGPT with that question pre-populated.[1]

## How to use it

1. **Custom browser “search engine”**
   -  In Chrome, Firefox, Vivaldi, Edge, etc., add a new custom search engine with the template
     `https://chatgpt.com/?q=%s`
   -  Pick a short keyword (e.g., `gpt`).
   -  Now you can type `gpt your question` in the URL bar and hit Enter to jump straight into a ChatGPT draft conversation.

2. **Shortcuts & automations**
   -  On iOS or macOS Shortcuts, open a URL using the same template to pass dynamic text to ChatGPT.
   -  Any launcher that accepts a URL can send context directly into ChatGPT with one tap.

## Notes & limitations

-  Works on both free and paid ChatGPT tiers because it only pre-fills the chat box; it does **not** bypass login or add browsing capabilities.
-  If you rely on extensions that auto-submit the first prompt, combine them with this deep link to get a true one-click query.
-  Mobile apps (iOS/Android) currently recognize `chatgpt://` and similar schemes only for launching the app; the documented `?q=` parameter functions consistently in the web interface, and may open the query in the app if the device’s OS hands the URL to the installed ChatGPT app (behavior can vary by platform).
-  There is no documented parameter for attaching external documents; file upload still requires the UI or connected cloud-storage links as described in OpenAI’s help docs.[2]

In short, the ChatGPT equivalent of Claude’s `new?q=` is simply `https://chatgpt.com/?q=…`—a handy trick for browser keywords, scripts, and productivity workflows.[3][1]

[1](https://treyhunner.com/2024/07/chatgpt-and-claude-from-your-browser-url-bar/)
[2](https://help.openai.com/en/articles/9309188-add-files-from-connected-apps-in-chatgpt)
[3](https://www.reddit.com/r/shortcuts/comments/1436y1h/deeplink_url_schemes_for_the_chatgpt_app/)
[4](https://www.reddit.com/r/ChatGPTPro/comments/1j5kntv/is_there_a_way_to_make_chatgpt_to_read_the/)
[5](https://community.openai.com/t/uploading-files-uploaded-to-chatgpt-to-an-external-server-via-actions/519589)
[6](https://stackoverflow.com/questions/17709556/url-scheme-how-can-i-create-a-link-which-will-open-a-document-in-the-google-dr)
[7](https://community.openai.com/t/support-custom-url-schemes-or-intent-handlers-to-trigger-specific-behaviors-in-the-chatgpt-mobile-app/1255168)
[8](https://chromewebstore.google.com/detail/links-in-chatgpt-access-w/gofdkikcfoigjdnjjghdinecnfpnkmdf)
[9](https://techpoint.africa/guide/can-chatgpt-access-links/)
[10](https://community.openai.com/t/can-chatgpt-have-access-to-and-read-shared-documentation-including-e-form-documents/59143)
[11](https://community.openai.com/t/make-gpt-return-clickable-links-in-chat/694969)
[12](https://www.geeksforgeeks.org/websites-apps/fix-chatgpt-external-files-error/)
[13](https://stackoverflow.com/questions/62009043/how-to-open-url-scheme-mailto-tel-on-q-item-click)
[14](https://github.com/orgs/community/discussions/165227)
[15](https://stackoverflow.com/questions/13130442/multiple-apps-with-the-same-url-scheme-ios)