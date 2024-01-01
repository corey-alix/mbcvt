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
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "A01",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "A02",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "A03",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B04",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B05",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B06",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B07A",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B07B",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B08",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B09",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B10",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B11",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B12",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "B13",
    power: '30 amp',
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
    power: '30 amp',
    water: true,
    sewer: false,
}, {
    alias: "F01",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "F02",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "F03",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "F04",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "F05",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "F06",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    alias: "F07",
    power: '30 amp',
    water: true,
    sewer: true,
},].map((site, siteId) => {
    let dailyRate = 20;
    if (site.power) {
        if (site.power === '30A') dailyRate += 5;
        else if (site.power === '50A') dailyRate += 10;
        else dailyRate += 2;
    }

    if (site.water) dailyRate += 5;
    if (site.sewer) dailyRate += 5;

    const availableDates = range(100).map((_, i) => {
        const openingDate = new Date('2024-05-01');
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