import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, Badge, Empty } from "@/components/ui";
import { ListPager } from "@/components/list-pager";
import { DEFAULT_PAGE_SIZE, pageSkip, parsePage } from "@/lib/list-page";
import { formatDate } from "@/lib/utils";
import { COMPLAINT_ISSUES, COMPLAINT_STATUSES, labelOf } from "@/lib/labels";

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const query = { page: String(page) };
  const [total, rows] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.findMany({
      include: { customer: true, item: true },
      orderBy: { createdAt: "desc" },
      skip: pageSkip(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);
  return (
    <div>
      <PageHeader
        title="Complaints & feedback loop"
        subtitle="Report → root cause → change → new sample → test → standardise."
        actions={<LinkButton href="/quality/complaints/new">Log complaint</LinkButton>}
      />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>No complaints logged.</Empty>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Customer</Th>
                  <Th>SKU</Th>
                  <Th>Issue</Th>
                  <Th>Status</Th>
                  <Th>Opened</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link href={`/quality/complaints/${r.id}`} className="font-medium hover:text-saffron">
                        {r.number}
                      </Link>
                    </Td>
                    <Td>{r.customer.name}</Td>
                    <Td>{r.item?.name ?? "—"}</Td>
                    <Td>{labelOf(COMPLAINT_ISSUES, r.issue)}</Td>
                    <Td>
                      <Badge tone={r.status === "CLOSED" || r.status === "STANDARDISED" ? "ok" : "warn"}>
                        {labelOf(COMPLAINT_STATUSES, r.status)}
                      </Badge>
                    </Td>
                    <Td>{formatDate(r.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPager basePath="/quality/complaints" page={page} total={total} query={query} />
          </>
        )}
      </Card>
    </div>
  );
}
