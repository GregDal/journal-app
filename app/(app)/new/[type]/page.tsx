import QuickCaptureForm from "@/components/entry/QuickCaptureForm";
import ReflectionForm from "@/components/entry/ReflectionForm";
import ComprehensiveForm from "@/components/entry/ComprehensiveForm";
import CBTForm from "@/components/entry/CBTForm";
import { notFound } from "next/navigation";

const FORMS: Record<string, React.ComponentType> = {
  quick: QuickCaptureForm,
  reflection: ReflectionForm,
  comprehensive: ComprehensiveForm,
  cbt: CBTForm,
};

export default async function NewEntryPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const Form = FORMS[type];
  if (!Form) notFound();

  return <Form />;
}
