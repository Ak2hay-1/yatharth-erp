export async function triggerRevalidate() {
  const url = process.env.VERCEL_REVALIDATE_URL?.trim();
  const secret = process.env.REVALIDATE_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return;

  const paths = ["/", "/products", "/price-list", "/about", "/contact"];
  await Promise.allSettled(
    paths.map((path) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ path }),
      }),
    ),
  );
}
