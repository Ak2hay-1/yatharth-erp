import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { FINANCE } from "@/lib/permissions";
import { Card, PageHeader, Table, Td, Th, LinkButton, Empty, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionForm } from "@/components/action-form";
import { ListPager, SortLink } from "@/components/list-pager";
import { voidPayment } from "@/server/payments";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage, parseSortDir, parseSortKey } from "@/lib/list-page";
import { formatDate, money } from "@/lib/utils";

const SORT_KEYS = ["number", "date", "amount", "createdAt"] as const;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
}) {
  await requireRole(FINANCE);
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const sort = parseSortKey(sp.sort, SORT_KEYS, "createdAt");
  const dir = parseSortDir(sp.dir);
  const query = { sort, dir, page: String(page) };

  const [total, rows] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({
      include: { party: true, allocations: true },
      orderBy: { [sort]: dir } as Prisma.PaymentOrderByWithRelationInput,
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Customer receipts and supplier payments."
        actions={
          <>
            <LinkButton href="/payments/new?direction=IN">Receive</LinkButton>
            <LinkButton href="/payments/new?direction=OUT" variant="secondary">
              Pay supplier
            </LinkButton>
          </>
        }
      />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No payments recorded.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>
                    <SortLink basePath="/payments" query={query} sortKey="number" currentSort={sort} currentDir={dir}>
                      Number
                    </SortLink>
                  </Th>
                  <Th>Party</Th>
                  <Th>Direction</Th>
                  <Th>
                    <SortLink basePath="/payments" query={query} sortKey="date" currentSort={sort} currentDir={dir}>
                      Date
                    </SortLink>
                  </Th>
                  <Th>Mode</Th>
                  <Th>
                    <SortLink basePath="/payments" query={query} sortKey="amount" currentSort={sort} currentDir={dir}>
                      Amount
                    </SortLink>
                  </Th>
                  <Th>Unallocated</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="font-medium">{r.number}</Td>
                    <Td>{r.party.name}</Td>
                    <Td>
                      <Badge tone={r.direction === "IN" ? "ok" : "warn"}>{r.direction}</Badge>
                    </Td>
                    <Td>{formatDate(r.date)}</Td>
                    <Td>{r.mode}</Td>
                    <Td>{money(r.amount)}</Td>
                    <Td>{money(r.amount - r.allocations.reduce((s, a) => s + a.amount, 0))}</Td>
                    <Td>
                      <ActionForm action={voidPayment.bind(null, r.id)}>
                        <SubmitButton variant="danger">Void</SubmitButton>
                      </ActionForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/payments" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
