import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@/components/BookingsPage";

export const Route = createFileRoute("/_authenticated/bookings/room")({
  component: () => (
    <BookingsPage
      kind="club_room"
      title="/ CLUB ROOM BAY"
      tagline="/ Facility · Meeting room /"
      description="FACILITY RESERVATIONS & ACCESS LOG"
    />
  ),
});
