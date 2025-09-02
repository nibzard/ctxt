import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            h1: {
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h2: {
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h3: {
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            p: {
              marginBottom: '1rem',
            },
            ul: {
              marginBottom: '1rem',
              paddingLeft: '1.5rem',
            },
            ol: {
              marginBottom: '1rem',
              paddingLeft: '1.5rem',
            },
            blockquote: {
              borderLeft: '4px solid #3b82f6',
              paddingLeft: '1rem',
              margin: '1rem 0',
              fontStyle: 'italic',
              backgroundColor: '#f8fafc',
            },
            code: {
              backgroundColor: '#f1f5f9',
              padding: '0.2rem 0.4rem',
              borderRadius: '0.25rem',
              fontFamily: "'Courier New', monospace",
            },
            pre: {
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflowX: 'auto',
              margin: '1rem 0',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config;