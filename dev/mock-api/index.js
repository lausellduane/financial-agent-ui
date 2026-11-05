// Local stand-in. Name is financial-agent-server-mock so a deploy cannot
// replace the real financial-agent-server Worker. The UI dev env binds it.
let report = {
  loaded: true,
  count: 128,
  startDate: "2024-01-03",
  endDate: "2024-06-28",
  uploadedAt: "2024-06-28T15:04:00.000Z",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/report") {
      return Response.json(report);
    }
    if (request.method === "POST" && url.pathname === "/api/upload") {
      report = {
        loaded: true,
        count: report.count + 12,
        startDate: report.startDate,
        endDate: report.endDate,
        uploadedAt: new Date().toISOString(),
      };
      return Response.json({ count: 12 });
    }
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? null
        : await request.text();
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
