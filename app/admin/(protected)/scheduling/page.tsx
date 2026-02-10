import prisma from "@/lib/prisma";
import AdminSchedulingManager from "../../components/AdminSchedulingManager";
import {
  getDefaultScheduleConfig,
  normalizeScheduleConfig,
} from "@/lib/fulfillmentSchedule";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingPage() {
  const defaults = getDefaultScheduleConfig();

  const settings = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, fulfillmentSchedule: defaults },
    update: {},
    select: { fulfillmentSchedule: true },
  });

  const schedule = normalizeScheduleConfig(settings.fulfillmentSchedule);

  if (!settings.fulfillmentSchedule) {
    await prisma.storeSettings.update({
      where: { id: 1 },
      data: { fulfillmentSchedule: schedule },
    });
  }

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

