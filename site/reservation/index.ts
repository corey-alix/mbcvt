import "../components/week-grid/index.js";
import { WeekGrid } from "../components/week-grid/index.js";
import { database } from "../db/index.js";
import { asDateString, getElements } from "../fun/index.js";

const sites =
  "F1,F2,F3,F4,F5,F6,F7,PULLOUT,BARNYARD,0,1,2,3,4,5,6,7A,7B,8,9,10,12,13,14,15,16,17,18,19,20,21,21B,22".split(
    ","
  );
export async function setupReservationForm() {
  await database.init();
  const grid = document.querySelector<WeekGrid>("week-grid")!;
  const currentDate = new Date();
  grid.startDate = currentDate;

  const ux = {
    priorWeek: null as any as HTMLButtonElement,
    nextWeek: null as any as HTMLButtonElement,
    thisWeek: null as any as HTMLButtonElement,
  };
  getElements(ux, document.body);

  ux.thisWeek.addEventListener("click", () => {
    currentDate.setDate(new Date().getDate());
    grid.startDate = currentDate;
  });

  ux.priorWeek.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 7);
    grid.startDate = currentDate;
  });

  ux.nextWeek.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 7);
    grid.startDate = currentDate;
  });

  const siteAvailability = database.getSiteAvailability();
  for (let siteId of sites) {
    if (!siteAvailability.some((site) => site.site === siteId)) {
      siteAvailability.push({
        site: siteId,
        reserved: [],
      });
    }
  }

  grid.availableSites = siteAvailability;
  grid.addEventListener("cell-click", async (event) => {
    const cellData = (event as CustomEvent).detail as {
      site: string;
      date: string;
      reserved: boolean;
    };
    const siteInfo = siteAvailability.find(
      (site) => site.site === cellData.site
    );
    if (!siteInfo) throw new Error("Site not found");

    if (!cellData.reserved) {
      const reservationDate = cellData.date;
      // is there a block that begins one day after the reservation date?
      const nextDay = new Date(reservationDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const reservationEnd = siteInfo.reserved.find(
        (reservation) => reservation.range.start === asDateString(nextDay)
      );
      if (reservationEnd) {
        reservationEnd.range.start = reservationDate;
      } else {
        // is there a block that ends one day before the reservation date?
        const previousDay = new Date(reservationDate);
        previousDay.setDate(previousDay.getDate() - 1);
        const reservationStart = siteInfo.reserved.find(
          (reservation) => reservation.range.end === asDateString(previousDay)
        );
        if (reservationStart) {
          reservationStart.range.end = reservationDate;
        } else {
          siteInfo.reserved.push({
            range: {
              start: reservationDate,
              end: reservationDate,
            },
          });
        }
      }
      await database.upsertSiteAvailability(siteInfo);
      grid.refresh();
    } else {
      const reservation = siteInfo.reserved.find(
        (reservation) =>
          reservation.range.start <= cellData.date &&
          reservation.range.end >= cellData.date
      );
      if (!reservation) throw new Error("Reservation not found");

      if (reservation.range.start === cellData.date) {
        if (reservation.range.end === cellData.date) {
          siteInfo.reserved = siteInfo.reserved.filter(
            (r) => r !== reservation
          );
        } else {
          const nextDay = new Date(cellData.date);
          nextDay.setDate(nextDay.getDate() + 1);
          reservation.range.start = asDateString(nextDay);
        }
      } else if (reservation.range.end === cellData.date) {
        const previousDay = new Date(cellData.date);
        previousDay.setDate(previousDay.getDate() - 1);
        reservation.range.end = asDateString(previousDay);
      } else {
        const priorDay = new Date(cellData.date);
        priorDay.setDate(priorDay.getDate() - 1);
        const nextDay = new Date(cellData.date);
        nextDay.setDate(nextDay.getDate() + 1);

        const newReservation = {
          range: {
            start: asDateString(new Date(cellData.date)),
            end: reservation.range.end,
          },
        };
        siteInfo.reserved.push(newReservation);

        reservation.range.end = asDateString(priorDay);
      }

      await database.upsertSiteAvailability(siteInfo);
      grid.refresh();
    }
  });
}
