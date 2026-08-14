import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("axe trie detalhado", async ({ page }) => {
  await page.goto("/topico/trie/");
  await page.waitForSelector("html[data-hidratado]", { state: "attached" });
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).analyze();
  for (const v of violations) {
    console.log(`REGRA ${v.id} (${v.impact}) nós=${v.nodes.length}`);
    for (const n of v.nodes) {
      const d = (n.any?.[0] as { data?: Record<string, unknown> })?.data ?? {};
      console.log("   ", n.target.join(" "), JSON.stringify({ fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio }));
    }
  }
});
