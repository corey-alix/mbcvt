export const siteMap = [{
    site: 1,
    alias: "F8",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 2,
    alias: "F9",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 3,
    alias: "FA",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 4,
    alias: "R1",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 5,
    alias: "R2",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 6,
    alias: "R3",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 7,
    alias: "R4",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 7.1,
    alias: "R5",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 8,
    alias: "R6",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 9,
    alias: "R7",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 10,
    alias: "R8",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 11,
    alias: "R9",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 12,
    alias: "RA",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 13,
    alias: "RB",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 14,
    alias: "H1",
    power: false,
    water: false,
    sewer: false,
}, {
    site: 15,
    alias: "H2",
    power: true,
    water: true,
    sewer: false,
}, {
    site: 16,
    alias: "H3",
    power: true,
    water: true,
    sewer: true,
}, {
    site: 17,
    alias: "H4",
    power: true,
    water: true,
    sewer: false,
}, {
    site: 18,
    alias: "H5",
    power: true,
    water: true,
    sewer: false,
}, {
    site: 19,
    alias: "H6",
    power: false,
    water: true,
    sewer: false,
}, {
    site: 20,
    alias: "H7",
    power: true,
    water: true,
    sewer: false,
}, {
    site: 21,
    alias: "H8",
    power: true,
    water: true,
    sewer: false,
}, {
    site: 22,
    alias: "H9",
    power: false,
    water: false,
    sewer: false,
}, {
    site: 31,
    alias: "F1",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 32,
    alias: "F2",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 33,
    alias: "F3",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 34,
    alias: "F4",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 35,
    alias: "F5",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 36,
    alias: "F6",
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 37,
    alias: "F7",
    power: '30 amp',
    water: true,
    sewer: true,
},].map(site => {
    let dailyRate = 20;
    if (site.power) {
        if (site.power === '30A') dailyRate += 5;
        else if (site.power === '50A') dailyRate += 10;
        else dailyRate += 2;
    }

    if (site.water) dailyRate += 5;
    if (site.sewer) dailyRate += 5;

    if (!site.alias) site.alias = site.site.toString();

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
        ...site, dailyRate, availableDates,
    };
}).sort((a, b) => a.alias.localeCompare(b.alias));

function range(size: number) {
    return [...Array(size).keys()];
}

console.log(siteMap);