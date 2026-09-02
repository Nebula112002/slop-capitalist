const res = await fetch("http://127.0.0.1:8896/");
const html = await res.text();
const health = await fetch("http://127.0.0.1:8896/api/health").then((r) => r.json());
const jsMatch = html.match(/src="([^"]+\.js)"/);
const cssMatch = html.match(/href="([^"]+\.css)"/);
const jsUrl = jsMatch ? new URL(jsMatch[1], "http://127.0.0.1:8896/").href : null;
const js = jsUrl ? await fetch(jsUrl).then((r) => r.text()) : "";

const checks = {
  health: health.ok === true && health.port === 8896 && health.service === "slop-capitalist",
  title: html.includes("Slop Capitalist"),
  buyBest: js.includes("Buy BEST"),
  hireAll: js.includes("Hire all"),
  simulation: js.includes("The Simulation"),
  chest: js.includes("Comeback chest"),
  hype: js.includes("Hype shop"),
  username: js.includes("Username") || js.includes("username"),
  algo: js.includes("Enter the algorithm"),
  exportSave: js.includes("Copy export") || js.includes("exportSave"),
  tip: js.includes("Tap a row") || js.includes("Qty"),
  not3000: !js.includes(":3000") || js.includes("8896"),
};

console.log(JSON.stringify({ health, jsUrl, checks }, null, 2));
if (Object.values(checks).some((v) => !v)) process.exit(1);
