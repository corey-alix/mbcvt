export class D {
  static copy(to: Date, from: Date) {
    to.setTime(from.getTime());
  }

  static dateOnly(date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  static addDay(date: Date, days = 1): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  static closestMonday(date = new Date()): Date {
    const day = date.getDay();
    if (day === 1) return date;
    return D.addDay(date, -(day - 1));
  }

  static asDateOnly(ymd: string) {
    const year = parseInt(ymd.slice(0, 4), 10);
    const month = parseInt(ymd.slice(5, 7), 10) - 1;
    const day = parseInt(ymd.slice(8, 10), 10);
    return new Date(year, month, day);
  }

  static dayOfMonth(date: Date): number {
    return date.getDate();
  }

  static asYmd(date: Date) {
    const year = (date.getFullYear()).toString().padStart(4, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = (date.getDate()).toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}