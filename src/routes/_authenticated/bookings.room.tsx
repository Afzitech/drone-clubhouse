import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@/components/BookingsPage";

export const Route = createFileRoute("/_authenticated/bookings/room")({
  component: () => (
    <BookingsPage
      kind="club_room"
      title="Club Room bookings"
      tagline="/ Facility · Meeting room /"
      description="Reserve the club room for meetings, workshops, or team sessions. Admin approval required."
    />
  ),
});
