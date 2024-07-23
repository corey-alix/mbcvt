import "../components/week-grid/index.js";
import { WeekGrid } from "../components/week-grid/index.js";

export function setupReservationForm() {
  const grid = document.querySelector<WeekGrid>("week-grid")!;
  grid.startDate = new Date();
  grid.availableSites = [
    {
      site: 1,
      reserved: [
        {
          range: {
            start: new Date("2024-07-15"),
            end: new Date("2024-07-25"),
          },
        },
      ],
    },
  ];
}
