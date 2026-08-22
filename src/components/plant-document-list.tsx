import type { DocumentCategory } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader, Table, Td, Th, LinkButton, Empty, Badge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { formatFileSize } from "@/lib/document-storage";
import { DOCUMENT_TAGS, labelOf } from "@/lib/labels";

const META: Record<
  DocumentCategory,
  { title: string; subtitle: string; href: string; action: string; empty: string }
> = {
  SOP: {
    title: "SOPs",
    subtitle: "Standard operating procedures saved for the plant.",
    href: "/quality/sops",
    action: "Upload SOP",
    empty: "No SOPs uploaded yet.",
  },
  OTHER: {
    title: "Documents",
    subtitle: "Licences, training, QC, and other plant files.",
    href: "/quality/documents",
    action: "Upload document",
    empty: "No documents uploaded yet.",
  },
};

export async function PlantDocumentList({ category }: { category: DocumentCategory }) {
  const meta = META[category];
  const rows = await prisma.plantDocument.findMany({
    where: { category },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        actions={<LinkButton href={`${meta.href}/new`}>{meta.action}</LinkButton>}
      />
      <Card className="p-2">
        {rows.length === 0 ? (
          <Empty>{meta.empty}</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Number</Th>
                <Th>Title</Th>
                {category === "OTHER" ? <Th>Type</Th> : null}
                <Th>Version</Th>
                <Th>File</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`${meta.href}/${r.id}`} className="font-medium hover:text-saffron">
                      {r.number}
                    </Link>
                  </Td>
                  <Td>{r.title}</Td>
                  {category === "OTHER" ? (
                    <Td>
                      {r.tag ? <Badge tone="neutral">{labelOf(DOCUMENT_TAGS, r.tag) || r.tag}</Badge> : "—"}
                    </Td>
                  ) : null}
                  <Td>{r.version}</Td>
                  <Td className="text-muted">
                    {r.fileName} · {formatFileSize(r.sizeBytes)}
                  </Td>
                  <Td>{formatDate(r.updatedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
