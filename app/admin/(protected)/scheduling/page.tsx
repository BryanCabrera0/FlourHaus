import AdminSchedulingManager from "../../components/AdminSchedulingManager";
import { getStoreSettingsSnapshot } from "@/lib/storeSettings";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingPage() {
  const { schedule } = await getStoreSettingsSnapshot();

  return (
    <div className="space-y-5">
      <div className="panel menu-header-panel p-6">
        <h1 className="text-3xl font-bold mb-2 text-fh-heading">
          Scheduling
        </h1>
        <p className="text-fh-muted">
          Set which days and time slots customers can pick for pickup or delivery.
        </p>
      </div>

      <AdminSchedulingManager initialSchedule={schedule} />
    </div>
  );
}
