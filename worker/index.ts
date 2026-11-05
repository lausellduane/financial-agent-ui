export interface Env {
  API: {
    fetch(request: Request): Promise<Response>;
  };
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const FORWARDED_HEADERS = [
  "content-type",
  "cf-access-jwt-assertion",
  "cookie",
  "accept",
] as const;

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function forwardedApiRequest(request: Request): Request {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const method = request.method;
  return new Request(request.url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (!isApiPath(pathname)) {
      return env.ASSETS.fetch(request);
    }
    return env.API.fetch(forwardedApiRequest(request));
  },
};
