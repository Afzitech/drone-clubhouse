import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@/components/BookingsPage";

export const Route = createFileRoute("/_authenticated/bookings/printer")({
  component: () => (
    <BookingsPage
      kind="printer_3d"
      title="/ 3D PRINTER BAY"
      tagline="/ Fabrication · 3D printer /"
      description="ADDITIVE MANUFACTURING QUEUE"
    />
  ),
});
