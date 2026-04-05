import { PageHeader } from "@/components/shared/PageHeader";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        {/* We could add a sidebar nav here in the future if needed */}
        <div className="flex-1">
            {children}
        </div>
      </div>
    </div>
  );
}