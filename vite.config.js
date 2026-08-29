import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// base: su GitHub Pages un repo "progetto" è servito da /<nome-repo>/.
// Il workflow di deploy imposta VITE_BASE automaticamente; in locale resta "/".
const base = process.env.VITE_BASE || "/";

// PWA: shell offline + installabile su home screen.
// registerType "prompt": alla nuova pubblicazione l'app mostra l'avviso
// "Nuova versione disponibile" con azione di refresh (spec §8), gestito da
// <UpdatePrompt/> tramite useRegisterSW.
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      // La libreria HEIC (~1.3 MB) è caricata solo su richiesta: la escludiamo
      // dalla precache così l'installazione dell'app resta leggera.
      workbox: {
        globIgnores: ["**/heic2any-*.js"],
        // Di default ogni navigazione viene servita con index.html (shell della
        // SPA): senza questa eccezione chi ha l'app installata vedrebbe l'app
        // al posto dell'informativa privacy, che deve restare raggiungibile
        // come pagina vera (Google la controlla).
        navigateFallbackDenylist: [/privacy\.html$/],
      },
      manifest: {
        name: "Bonsai Manager",
        short_name: "Bonsai Manager",
        description: "Gestione collezione bonsai — soci STAB",
        lang: "it",
        theme_color: "#1C1B19",
        background_color: "#E6E2D6",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
});
