export const siteMap = [{
    site: 1,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 2,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 3,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 4,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 5,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 6,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 7,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 8,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 9,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 10,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 11,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 12,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 13,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 14,
    power: false,
    water: false,
    sewer: false,
}, {
    site: 15,
    power: true,
    water: true,
    sewer: false,
}, {
    site: 16,
    power: true,
    water: true,
    sewer: true,
}, {
    site: 17,
    power: true,
    water: true,
    sewer: false,
}, {
    site: 18,
    power: true,
    water: true,
    sewer: false,
}, {
    site: 19,
    power: false,
    water: true,
    sewer: false,
}, {
    site: 20,
    power: true,
    water: true,
    sewer: false,
}, {
    site: 21,
    power: true,
    water: true,
    sewer: false,
}, {
    site: 22,
    power: false,
    water: false,
    sewer: false,
}, {
    site: 23,
    power: false,
    water: false,
    sewer: false,
}, {
    site: 31,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 32,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 33,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 34,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 35,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 36,
    power: '30 amp',
    water: true,
    sewer: true,
}, {
    site: 37,
    power: '30 amp',
    water: true,
    sewer: true,
},].map(site => {
    let dailyRate = 20;
    if (site.power === '30 amp') dailyRate += 3;
    if (site.power === '50 amp') dailyRate += 5;
    if (site.water) dailyRate += 2;
    if (site.sewer) dailyRate += 2;

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
});

function range(size: number) {
    return [...Array(size).keys()];
}

console.log(siteMap);