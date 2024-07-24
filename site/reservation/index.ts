import "../components/week-grid/index.js";
import { WeekGrid } from "../components/week-grid/index.js";
import { database, SiteAvailabilityModel } from "../db/index.js";
import { D } from "../fun/D.js";
import { asDateString, autoShortcut, getElements } from "../fun/index.js";

function asDateOnly(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export async function setupReservationForm() {
  await database.init();
  const grid = document.querySelector<WeekGrid>("week-grid")!;
  const currentDate = asDateOnly();
  grid.startDate = asDateString(currentDate);

  const ux = {
    priorWeek: null as any as HTMLButtonElement,
    nextWeek: null as any as HTMLButtonElement,
    thisWeek: null as any as HTMLButtonElement,
    addNote: null as any as HTMLInputElement,
    showAllSites: null as any as HTMLButtonElement,
    siteDayTemplate: null as any as HTMLDivElement,
    siteNumber: null as any as HTMLInputElement,
    siteNote: null as any as HTMLTextAreaElement,
    siteDate: null as any as HTMLInputElement,
    reserveSite: null as any as HTMLButtonElement,
    cancelSite: null as any as HTMLButtonElement,
  };
  getElements(ux, document.body);
  autoShortcut();

  let activeNote = false;
  let lastNote = "";

  let showAllSites = false;
  ux.showAllSites.addEventListener("click", () => {
    showAllSites = !showAllSites;
    grid.showAllSites = showAllSites;
  });

  ux.addNote.addEventListener("click", async () => {
    activeNote = !activeNote;
    document.body.classList.toggle("add-note-tool", activeNote);
  });

  ux.thisWeek.addEventListener("click", () => {
    D.copy(currentDate, D.dateOnly(D.closestMonday()));
    grid.startDate = asDateString(currentDate);
  });

  ux.priorWeek.addEventListener("click", () => {
    D.copy(currentDate, D.addDay(currentDate, -7));
    grid.startDate = asDateString(currentDate);
  });

  ux.nextWeek.addEventListener("click", () => {
    D.copy(currentDate, D.addDay(currentDate, 7));
    grid.startDate = asDateString(currentDate);
  });

  const siteAvailability = database.getSiteAvailability().sort((a, b) => {
    const v1 = a.site.padStart(3, "0");
    const v2 = b.site.padStart(3, "0");
    return v1.localeCompare(v2);
  });

  grid.availableSites = siteAvailability;

  grid.addEventListener("cell-click", async (event) => {
    if (!activeNote) return;
    const cellData = (event as CustomEvent).detail as {
      site: string;
      date: string;
      reserved: boolean;
    };
    const siteInfo = siteAvailability.find(
      (site) => site.site === cellData.site
    );
    if (!siteInfo) throw new Error("Site not found");

    ux.siteDayTemplate.classList.remove("hidden");
    ux.siteNumber.value = cellData.site;
    ux.siteDate.value = cellData.date;

    const note = database
      .getSiteNotes()
      .find((n) => n.site === cellData.site && n.date === cellData.date);

    ux.siteNote.value = note?.note || "";
  });

  ux.cancelSite.addEventListener("click", async () => {
    const site = ux.siteNumber.value;
    const date = ux.siteDate.value;

    const siteInfo = siteAvailability.find(
      (s) => s.site === site && isReserved(s, date)
    );

    if (siteInfo) {
      removeDateFromReservation(date, siteInfo);
      await database.upsertSiteAvailability(siteInfo);
    }

    const siteNote = ux.siteNote.value;
    if (siteNote) {
      await database.upsertNote({
        site,
        date,
        note: siteNote,
      });
    } else {
      /*await*/ database.deleteNote({
        site,
        date,
      });
    }

    grid.refresh();
    ux.siteDayTemplate.classList.add("hidden");
  });

  ux.reserveSite.addEventListener("click", async () => {
    const site = ux.siteNumber.value;
    const date = ux.siteDate.value;

    const siteInfo = siteAvailability.find((s) => s.site === site);
    if (!siteInfo) throw "site not found";
    if (!isReserved(siteInfo, date)) {
      addDateToReservation(date, siteInfo);
      await database.upsertSiteAvailability(siteInfo);
    }

    const siteNote = ux.siteNote.value;
    if (siteNote) {
      await database.upsertNote({
        site,
        date,
        note: siteNote,
      });
    }

    grid.refresh();
    ux.siteDayTemplate.classList.add("hidden");
  });

  grid.addEventListener("cell-click", async (event) => {
    if (activeNote) return;
    const cellData = (event as CustomEvent).detail as {
      site: string;
      date: string;
      reserved: boolean;
    };
    const siteInfo = siteAvailability.find(
      (site) => site.site === cellData.site
    );
    if (!siteInfo) throw new Error("Site not found");

    if (activeNote) {
      const note = database
        .getSiteNotes()
        .find((n) => n.site === cellData.site && n.date === cellData.date);
      lastNote = note ? note.note : lastNote;
      const promptResult = prompt("Enter a note", lastNote);
      if (null == promptResult) return;
      lastNote = promptResult || "";
      if (!lastNote) {
        activeNote = false;
        await database.deleteNote({
          site: cellData.site,
          date: cellData.date,
        });
        grid.refresh();
        return;
      }

      await database.upsertNote({
        site: cellData.site,
        date: cellData.date,
        note: lastNote,
      });
      grid.refresh();
      return;
    }

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

function addDateToReservation(
  reservationDate: string,
  siteInfo: SiteAvailabilityModel
) {
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
}

function removeDateFromReservation(
  date: string,
  siteInfo: SiteAvailabilityModel
) {
  const reservation = siteInfo.reserved.find(
    (r) => r.range.start <= date && r.range.end >= date
  );
  if (!reservation) throw "reservation not found";

  if (reservation.range.start === date) {
    if (reservation.range.end === date) {
      siteInfo.reserved = siteInfo.reserved.filter((r) => r !== reservation);
    } else {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      reservation.range.start = asDateString(nextDay);
    }
  } else if (reservation.range.end === date) {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    reservation.range.end = asDateString(previousDay);
  } else {
    const priorDay = new Date(date);
    priorDay.setDate(priorDay.getDate() - 1);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const newReservation = {
      range: {
        start: asDateString(new Date(date)),
        end: reservation.range.end,
      },
    };
    siteInfo.reserved.push(newReservation);

    reservation.range.end = asDateString(priorDay);
  }
}

function isReserved(site: SiteAvailabilityModel, date: string) {
  return site.reserved.some((reservation) => {
    const result =
      date >= reservation.range.start && date <= reservation.range.end;
    return result;
  });
}
