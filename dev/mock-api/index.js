// Local stand-in. Name is financial-agent-server-mock so a deploy cannot
// replace the real financial-agent-server Worker. The UI dev env binds it.
function replacementCount(raw) {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.includes(",") &&
        !line.startsWith("--") &&
        !line.toLowerCase().startsWith("content-"),
    );
  if (rows.length === 0) return 12;
  const header = /date|amount|description|transaction/i.test(rows[0]);
  const count = header ? rows.length - 1 : rows.length;
  return count > 0 ? count : rows.length;
}

const exampleMonths = [
  {
    month: "2024-05",
    label: "May 2024",
    totalCents: 188400,
    diningCents: 26100,
    categories: [
      { name: "Groceries", cents: 55000 },
      { name: "Utilities", cents: 52000 },
      { name: "Eating out", cents: 26100 },
      { name: "Gas/auto", cents: 14800 },
      { name: "Other", cents: 40500 },
    ],
    topMerchants: [
      { name: "Sample Market", cents: 24000 },
      { name: "Example Energy", cents: 18000 },
      { name: "Demo Cafe", cents: 9000 },
    ],
    biggestPurchase: { name: "Example Energy", cents: 18000 },
  },
  {
    month: "2024-06",
    label: "Jun 2024",
    totalCents: 198600,
    diningCents: 31800,
    categories: [
      { name: "Groceries", cents: 58000 },
      { name: "Utilities", cents: 54000 },
      { name: "Eating out", cents: 31800 },
      { name: "Gas/auto", cents: 15500 },
      { name: "Other", cents: 39300 },
    ],
    topMerchants: [
      { name: "Sample Market", cents: 26000 },
      { name: "Example Energy", cents: 19000 },
      { name: "Demo Cafe", cents: 8800 },
    ],
    biggestPurchase: { name: "Example Energy", cents: 19000 },
  },
];

let report = {
  loaded: true,
  count: 128,
  startDate: "2024-01-03",
  endDate: "2024-06-28",
  uploadedAt: "2024-06-28T15:04:00.000Z",
  months: exampleMonths,
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/report") {
      return Response.json(report);
    }
    if (request.method === "POST" && url.pathname === "/api/upload") {
      const raw = await request.text();
      const count = replacementCount(raw);
      report = {
        loaded: count > 0,
        count,
        startDate: report.startDate,
        endDate: report.endDate,
        uploadedAt: new Date().toISOString(),
        months: count > 0 ? exampleMonths : [],
      };
      return Response.json({ count });
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
