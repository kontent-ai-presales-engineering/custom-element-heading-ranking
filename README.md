# Getting Started

To start the development server run:
- `npm ci` - install dependencies
- `npm run dev` start the development server usually on the https://localhost:5173 (the port can be different if 5173 is already in use)
- The `npm run dev` generates a self-signed certificate for the development server.
  Open the url in a browser and proceed to the website through the browser warning.
- Once you proceed, the browser will remember the exception and will not ask again. (Works in chromium-based browsers)
  Then the element will properly load in the `iframe` in Kontent.ai.
- Remember to check out the required configuration of the element in `src/customElement/config.ts` and provide the configuration in the content type.

