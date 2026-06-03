/**
 * Guardian Portal - Unified view of all souls in your care.
 * 
 * Features:
 * - Soul Grid with health scores (persona, calibration, memory, conversation)
 * - Quick Actions: Chat, Calibrate, Learn, Visit
 * - Interactions timeline (recent activities, encounters, schedule events)
 * - Search and filter by category
 * - Live data from /api/guardian/portal
 * - Demo mode with preset souls when DB is unavailable
 */

import { GuardianPortal } from "@/components/guardian/GuardianPortal";

export default async function GuardianPortalPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <GuardianPortal />
    </div>
  );
}
