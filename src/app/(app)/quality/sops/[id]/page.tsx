import { PlantDocumentDetail } from "@/components/plant-document-detail";

export default async function SopDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  const { id } = await params;
  const { locale } = await searchParams;
  return <PlantDocumentDetail category="SOP" id={id} localeRaw={locale} />;
}
