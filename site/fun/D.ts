export class D {
  static copy(to: Date, from: Date) {
    to.setTime(from.getTime());
  }

  static dateOnly(date = new Date()): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  static asYmd(date: Date): string {
    return date.toISOString().split("T")[0];
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
    return new Date(ymd);
  }

  static dayOfMonth(date: Date): number {
    return date.getDate();
  }
}
