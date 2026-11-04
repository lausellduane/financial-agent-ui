// Local stand-in for financial-agent-server. Not deployed.
// `wrangler dev` discovers it by service name and the UI binding calls it.
export default {
  async fetch(request) {
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? null
        : await request.text();
    const url = new URL(request.url);
    return Response.json({
      ok: true,
      method: request.method,
      pathname: url.pathname,
      search: url.search,
      assertion: request.headers.get("Cf-Access-Jwt-Assertion"),
      contentType: request.headers.get("content-type"),
      body,
    });
  },
};
