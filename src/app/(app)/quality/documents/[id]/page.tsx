import { PlantDocumentDetail } from "@/components/plant-document-detail";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlantDocumentDetail category="OTHER" id={id} />;
}
