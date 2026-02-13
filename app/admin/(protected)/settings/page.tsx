import AdminSmsSettings from "../../components/AdminSmsSettings";
import { getStoreSettingsSnapshot } from "@/lib/storeSettings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { ownerSmsPhone, ownerSmsCarrier } = await getStoreSettingsSnapshot();

  return (
    <div className="space-y-5">
      <div className="panel menu-header-panel p-6">
        <h1 className="text-3xl font-bold mb-2 text-fh-heading">
          Settings
        </h1>
        <p className="text-fh-muted">
          Configure notifications and other store settings.
        </p>
      </div>

      <AdminSmsSettings initialPhone={ownerSmsPhone} initialCarrier={ownerSmsCarrier} />
    </div>
  );
}
