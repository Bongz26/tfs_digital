// Shared API configuration for all API calls
// Ensures consistent API host detection across all components

// Decide API host:
// - If running the frontend on localhost → always use local backend on port 5000
// - Otherwise → use REACT_APP_API_URL if set, else fall back to Render URL
export const getApiHost = () => {
  const forceRemote = String(process.env.REACT_APP_FORCE_REMOTE || process.env.REACT_APP_USE_REMOTE_ON_LOCALHOST || '').toLowerCase() === 'true';

  // Prefer explicit env URL first (works for localhost too)
  const envUrl = process.env.REACT_APP_API_URL?.trim();
  if (envUrl) {
    try {
      let cleanUrl = envUrl;
      if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
        cleanUrl = `https://${envUrl}`;
      }
      const url = new URL(cleanUrl);
      const cleanHost = `${url.protocol}//${url.host}`;
      console.log("🔧 [API Config] Using explicit REACT_APP_API_URL:", envUrl, "→", cleanHost);
      return cleanHost;
    } catch (e) {
      console.warn("⚠️ Invalid REACT_APP_API_URL, ignoring:", e.message);
    }
  }

  // If we are on localhost and NOT forcing remote, default to local backend with optional port override
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "" || hostname === "::1";
    if (isLocal && !forceRemote) {
      const port = String(process.env.REACT_APP_API_PORT || '').trim() || '5001';
      const localUrl = `http://localhost:${port}`;
      console.log("🔧 [API Config] Detected localhost - using", localUrl, "(override via REACT_APP_API_PORT or REACT_APP_FORCE_REMOTE=true)");
      return localUrl;
    }
  }

  // Fallback to Render URL when not local or when forced remote
  return "https://admintfs.onrender.com";
};

// Export as a function that gets called, not a constant, to ensure it's evaluated at runtime
export const API_HOST = getApiHost();

// Debug logging
if (typeof window !== "undefined") {
  console.log("🌐 [API Config] Window hostname:", window.location.hostname);
  console.log("🌐 [API Config] REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
  console.log("🌐 [API Config] REACT_APP_FORCE_REMOTE:", process.env.REACT_APP_FORCE_REMOTE);
  console.log("🌐 [API Config] Final API_HOST:", API_HOST);
}
