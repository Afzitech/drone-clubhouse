import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@/components/BookingsPage";

export const Route = createFileRoute("/_authenticated/bookings/printer")({
  component: () => (
    <BookingsPage
      kind="printer_3d"
      title="3D Printer bookings"
      tagline="/ Fabrication · 3D printer /"
      description="Reserve the 3D printer for prints. Admin approval required."
    />
  ),
});
