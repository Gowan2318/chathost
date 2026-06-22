import { Suspense } from "react";
import BuilderPageClient from "./BuilderPageClient";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuilderPageClient />
    </Suspense>
  );
}
