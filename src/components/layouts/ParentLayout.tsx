import { PortalLayout } from "./PortalLayout";
import { ParentProvider } from "@/contexts/ParentContext";

export default function ParentLayout() {
  return (
    <ParentProvider>
      <PortalLayout role="parent" title="Parent Portal" />
    </ParentProvider>
  );
}
