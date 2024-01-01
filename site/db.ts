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
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "A01",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "A02",
    power: true,
    water: true,
    sewer: true,
}, {
    alias: "A03",
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
    if (site.power) dailyRate += powerRate;
    if (site.water) dailyRate += waterRate;
    if (site.sewer) dailyRate += sewerRate;

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
        site: siteId + 1, ...site, dailyRate, availableDates,
    };
}).sort((a, b) => a.alias.localeCompare(b.alias));

function range(size: number) {
    return [...Array(size).keys()];
}

console.log(siteMap);