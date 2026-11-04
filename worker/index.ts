export interface Env {
  API: {
    fetch(request: Request): Promise<Response>;
  };
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!isApiPath(pathname)) {
      return env.ASSETS.fetch(request);
    }
    // Pass the original Request through so method, body, and headers stay intact,
    // including Cf-Access-Jwt-Assertion added by Cloudflare Access.
    console.log(`forward ${request.method} ${pathname}`);
    return env.API.fetch(request);
  },
};
