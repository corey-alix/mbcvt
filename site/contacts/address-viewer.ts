import { database } from "../db/index.js";

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export class AddressContactManager {

  public async getAddress(id: number) {
    await database.init();
    const contactInfo = database.getContact(id);
    return {
      street: contactInfo.street!,
      city: contactInfo.city!,
      state: contactInfo.state!,
      zip: contactInfo.zip!,
    } satisfies Address;
  }

  
}
