const baseRate = 14;
const sewerRate = 10;
const waterRate = 5;
const powerRate = 10;

export const officeInfo = {
    name: 'Millbrook Campground',
    address: '1152 VT RT 100, Westfield, VT 05874',
    phone: '802.744.8085',
    email: 'camp@mbcg.email',
    template: {
        '{{no-vacancy}}': 'No sites are available on this date. Please call 802.744.8085 to see if we can find a way to accommodate you.'
    }
}

export const siteMap = [{
    alias: "A00",
    about: "This site is located nearest the bathhouse and above the brook.",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "A01",
    about: "This site is near the bathhouse and has a view of the brook and the pond, as well as the children's play area.",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "A02",
    about: "This site is near the bathhouse and has a view of the brook and the pond, as well as the children's play area.",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "A03",
    about: "This site is a short walk from the bathhouse and sits along the brook as well as the children's play area.",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B04",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B05",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B06",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B07A",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B07B",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B08",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B09",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B10",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B11",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B12",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "B13",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "C14",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "C15",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "B16",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "C17",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "C18",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "C19",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "C20",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "C21",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "C22",
    power: false,
    water: false,
    sewer: false,
}, {
    alias: "F00",
    about: "This is an overflow site between the pond and the brook and suitable for tents or small campers. It is a short walk to the bathhouse and the office.",
    power: true,
    water: true,
    sewer: false,
}, {
    alias: "F01",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "F02",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "F03",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "F04",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "F05",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "F06",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "F07",
    power: true,
    water: true,
    sewer: true,
},].map((site, siteId) => {
    let dailyRate = baseRate;
    const { power, water, sewer, about } = site;
    if (power) dailyRate += powerRate;
    if (water) dailyRate += waterRate;
    if (sewer) dailyRate += sewerRate;

    const availableDates = range(100).map((_, i) => {
        const openingDate = new Date();
        openingDate.setDate(openingDate.getDate() + i);
        // yyyy-mm-dd format
        return openingDate.toISOString().split('T')[0];
    });

    // remove some dates to simulate reservations
    // randomly remove 10 dates
    for (let i = 0; i < 3; i++) {
        const indexToRemove = Math.floor(Math.random() * availableDates.length);
        availableDates.splice(indexToRemove, Math.ceil(Math.random() * 21));
    }

    return {
        site: siteId + 1, ...site, dailyRate, availableDates, about: about || 'No description provided'
    };
}).sort((a, b) => a.alias.localeCompare(b.alias));

function range(size: number) {
    return [...Array(size).keys()];
}

console.log(siteMap);