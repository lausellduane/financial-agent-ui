// Local stand-in. Name is financial-agent-server-mock so a deploy cannot
// replace the real financial-agent-server Worker. The UI dev env binds it.
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
      cookie: request.headers.get("cookie"),
      accept: request.headers.get("accept"),
      contentType: request.headers.get("content-type"),
      stripped: request.headers.get("x-not-forwarded"),
      body,
    });
  },
};
