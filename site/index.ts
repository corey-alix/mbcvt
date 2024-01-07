import { officeInfo, siteMap } from "./db.js"
const MIN_RESERVATION_DAYS = 2;
const MAX_RESERVATION_DAYS = 28;

class EventManager {
    #queue: Record<string, Array<(e?: Event) => void>> = {};
    on(topic: string, callback: (e?: Event) => void) {
        if (!this.#queue[topic]) this.#queue[topic] = [];
        this.#queue[topic].push(callback);
    }
    trigger(topic: string, e: Event) {
        log(`trigger ${topic}`)
        this.#queue[topic]?.forEach(callback => callback(e));
    }
}

const globalEventManager = new EventManager();

export const bindings = makeObservable({
    "{{total-due}}": "",
    "{{total-nites}}": "",
    "{{primary-address}}": officeInfo.address,
    "{{primary-email}}": officeInfo.email,
    "{{primary-telephone-number}}": officeInfo.phone
}, globalEventManager);

// convert the bindings object into an observable that can be used to update the DOM
function makeObservable<T extends Object>(bindings: T, events: EventManager) {
    return new Proxy(bindings, {
        set: (target, property, value) => {
            (target as any)[property] = value;
            events.trigger(property as string, new Event('change'));
            return true;
        },
        get: (target, property) => {
            return (target as any)[property];
        },
    });
}

// insert template values into DOM
function applyTemplates() {
    const templateKeys = Object.keys(officeInfo.template) as Array<keyof typeof officeInfo.template>;
    const elements = document.querySelectorAll(`[data-has="template"]`);
    templateKeys.forEach(key => {
        elements.forEach(element => {
            const originalText = element.textContent;
            if (!originalText) return;
            const templateValue = officeInfo.template[key];
            const newText = originalText.replace(key, templateValue);
            element.textContent = newText;
        });
    });
}

function setupBindings() {
    const elements = document.querySelectorAll(`[data-has="binding"]`) as NodeListOf<HTMLElement>;
    function doit(key: keyof typeof bindings, element: HTMLElement, template: string) {
        const value = bindings[key];
        element.textContent = template.replace(key, value);
    }
    elements.forEach(element => {
        const originalText = element.textContent;
        if (!originalText) return;
        // find all bindings that start with "{{" and end with "}}"
        const matches = originalText.match(/{{.+?}}/g);
        if (!matches) return;
        matches.forEach(match => {
            const key = match as keyof typeof bindings;
            globalEventManager.on(key, () => doit(key, element, originalText));
            doit(key, element, originalText);
        });
    });

}

export function setupWelcomeForm() {
    registerFormActions();
    applyTemplates();
    setupBindings();
    initializationComplete();
}

export function setupReservationForm() {
    registerFormActions();
    applyTemplates();
    setupBindings();
    {
        const siteButtons = asHtml(generateSitePicker());
        const target = document.querySelector<HTMLElement>('#site-picker');
        if (!target) throw new Error('#site-picker is required');
        target.append(siteButtons);
        const buttons = target.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const siteNumber = button.value;
                const siteInput = document.querySelector<HTMLInputElement>('#site');
                if (!siteInput) throw new Error('#site is required');
                siteInput.value = siteNumber;
                trigger('input:show-site', e);
                trigger('input:compute', e);
                buttons.forEach(button => button.classList.remove('selected'));
                button.classList.add('selected');
            });
        });

        getFormElements().arrivalDateInput!.valueAsDate = new Date();
        constraintDepartureDate();
        updateAvailableSites();
        compute();

    }

    function getFormElements() {
        const form = document.querySelector<HTMLFormElement>('form')!;
        return {
            arrivalDateInput: form.querySelector<HTMLInputElement>('#arrival'),
            departureDateInput: form.querySelector<HTMLInputElement>('#departure'),
            siteInput: form.querySelector<HTMLInputElement>('#site'),
        }
    }

    function constraintDepartureDate() {
        const arrivalDateValue = getFormElements().arrivalDateInput?.value;
        if (!arrivalDateValue) return log('arrival date is required');
        const departureDate = getFormElements().departureDateInput;
        if (!departureDate) return log('departure date is required');

        // prevent user from selecting dates on or before arrival date
        const minDepartureDate = addDay(arrivalDateValue, MIN_RESERVATION_DAYS);
        departureDate.min = minDepartureDate;
        departureDate.max = addDay(arrivalDateValue, MAX_RESERVATION_DAYS);
        if (!departureDate.value || departureDate.value < minDepartureDate) departureDate.value = minDepartureDate;
    }

    on('change:constrain-departure-date', constraintDepartureDate)

    on('focus:select-all', (e?: Event) => {
        const element = e?.currentTarget as HTMLInputElement;
        if (!element) return;
        element.select();
    });

    on('click:toggle-full-screen', () => {
        const image = document.querySelector<HTMLImageElement>('#site-preview-img');
        if (!image) return log('image is required');

        // if full screen change the image extension to .jpg
        // otherwise change to .png
        const url = image.src;
        const currentExtension = url.includes('.jpg') ? '.jpg' : '.png';
        const wasFullscreen = currentExtension === '.jpg';
        const extension = !wasFullscreen ? '.jpg' : '.png';
        const newUrl = url.replace(/\.png|\.jpg/, extension);
        image.src = newUrl;
    });

    on('input:minmax', (e?: Event) => {
        const element = e?.currentTarget as HTMLInputElement;
        if (!element) return;
        const min = element.min;
        const max = element.max;
        const value = element.value;
        if (!value) return;
        if (min) {
            const minNumber = (min);
            if (minNumber > (value)) element.value = min;
        }
        if (max) {
            const maxNumber = (max);
            if (maxNumber < (value)) element.value = max;
        }
    });

    on('input:update-departure-date', () => {
        updateAvailableSites();
        compute();
    });

    on('input:show-site', (event?: Event) => {
        const elements = getFormElements();
        const siteNumber = elements.siteInput?.value;
        if (!siteNumber) return;

        const sitePreviewImg = document.querySelector<HTMLImageElement>('#site-preview-img');
        if (!sitePreviewImg) return;

        const siteInfo = siteMap.find(siteInfo => siteInfo.site === parseInt(siteNumber));
        if (!siteInfo) return log('site number is invalid');

        const url = `../assets/site_${siteInfo?.alias}.png`;
        sitePreviewImg.src = url;

        const aboutElement = document.querySelector<HTMLDivElement>('.about');
        let about = siteInfo?.about || "";

        const { power, water, sewer } = siteInfo;
        const utilities = [];
        if (power) utilities.push('electric');
        if (water) utilities.push('water');
        if (sewer) utilities.push('sewer');
        if (utilities.length > 0)
            about += ` This site has ${utilities.join(', ')}.`;

        if (aboutElement) aboutElement.innerHTML = about;

        const gallery = document.querySelector<HTMLDivElement>('.gallery');
        if (gallery) {
            const button = event?.currentTarget as HTMLButtonElement;
            if (!button) return;
            // navigate through the siblings until we wrap to the left
            let nextSibling = button;
            while (nextSibling) {
                // did this sibling wrap to the first column of the grid?
                if (nextSibling.offsetTop > button.offsetTop) {
                    break;
                }
                nextSibling = nextSibling.nextElementSibling as HTMLButtonElement;
                if (!nextSibling) break;
            }
            // insert the gallery after the button
            button.parentElement!.insertBefore(gallery, nextSibling);
        }
    });

    on('click:compute', () => {
        compute();
        alert("todo");
    });
    on('input:compute', compute);

    on(`input:update-length-of-stay`, () => {
        updateAvailableSites();
        compute();
    });

    initializationComplete();

    function updateAvailableSites() {
        log('update available sites')
        const elements = getFormElements();
        const arrivalDate = elements.arrivalDateInput?.value;
        if (!arrivalDate) return log('arrival date is required');

        const sitesAvailableOnArrival = siteMap.filter(siteInfo => {
            return siteInfo.availableDates.some(date => date === arrivalDate);
        });

        const departureDate = elements.departureDateInput?.value;
        if (!departureDate) return log('departure date is required');

        const sitesAvailable = sitesAvailableOnArrival.filter(s => isAvailable(s.availableDates, { arrivalDate, departureDate }));

        document.querySelectorAll(".if-no-vacancy").forEach(element => element.classList.toggle('hidden', sitesAvailable.length > 0));
        document.querySelectorAll(".if-vacancy").forEach(element => element.classList.toggle('hidden', sitesAvailable.length === 0));

        // black out all sites not available on departure
        const sitePickers = document.querySelectorAll<HTMLButtonElement>('.site-picker-button');
        sitePickers.forEach(sitePicker => {
            const siteNumber = sitePicker.value;
            const siteInfo = sitesAvailable.find(siteInfo => siteInfo.site === parseInt(siteNumber));
            sitePicker.classList.toggle('unavailable', !siteInfo);
            sitePicker.disabled = !siteInfo;
        });
    }

    function compute() {
        log('compute')
        const formElements = getFormElements();

        const arrivalDate = formElements.arrivalDateInput?.value;
        if (!arrivalDate) return log('arrival date is required');

        const departureDate = formElements.departureDateInput?.value;
        if (!departureDate) return log('departure date is required');

        const days = calculateDays(arrivalDate.toString(), departureDate.toString());
        if (days < 1) return log('departure date must be after arrival date');

        bindings["{{total-nites}}"] = days == 1 ? `overnight` : `${days} nights`;

        try {
            const siteNumber = formElements.siteInput?.value;
            const siteNumbers = siteNumber ? [siteNumber] : [];
            const total = siteNumbers.reduce((acc, siteNumber) => {
                const siteInfo = siteMap.find(siteInfo => siteInfo.site === parseInt(siteNumber));
                if (!siteInfo) throw log('site number is invalid');

                const { dailyRate, availableDates } = siteInfo;
                if (!dailyRate) throw log('site number is invalid, no daily rate');
                if (!isAvailable(availableDates, { arrivalDate, departureDate })) throw log('site is not available');

                return acc + computeSiteCharge(days, dailyRate);
            }, 0);
            bindings["{{total-due}}"] = total ? asUsd(total) : "";
            document.querySelectorAll(".if-price").forEach(element => element.classList.toggle('hidden', !total));
        } catch (ex) {
            bindings["{{total-due}}"] = "";
            document.querySelectorAll(".if-price").forEach(element => element.classList.toggle('hidden', true));
            log(ex + "");
        }


        const otherRates = document.querySelectorAll<HTMLDivElement>('.site-picker-button .rate');
        otherRates.forEach(rate => {
            const siteNumber = rate.closest<HTMLButtonElement>('button.site-picker-button')?.value;
            if (!siteNumber) return log('site number is required');
            const dailyRate = siteMap.find(siteInfo => siteInfo.site === parseInt(siteNumber))?.dailyRate;
            if (!dailyRate) return log('site number is invalid');
            const siteCharge = computeSiteCharge(days, dailyRate);
            const totalFormatted = asUsd(siteCharge);
            rate.innerText = totalFormatted;
        });
    }

    function generateSitePicker() {
        const utility = "small w-3hem pad-1 bg-white center bold";
        return siteMap.map(siteInfo => {
            const { alias, site, power, water, sewer, about } = siteInfo;
            return `<button class="site-picker-button site_${site}" value="${site}" title="${about}">
            ${site ? `<div class="small available">Available</div><div class="small not-available">Reserved</div><div class="site-number large">Site ${alias}</div>` : ''}
            <nav class="grid grid-3 pad-1">
                ${power ? `<div class="power ${utility}"></div>` : `<div class="nope ${utility}"></div>`}
                ${water ? `<div class="water ${utility}"></div>` : `<div class="nope ${utility}"></div>`}
                ${sewer ? `<div class="sewer ${utility}"></div>` : `<div class="nope ${utility}"></div>`}
                <div class="rate smaller span-3">$</div>
            </nav>
            </button>`;
        }).join('');
    }
}

function computeSiteCharge(days: number, dailyRate: number) {
    const freeDays = Math.floor(days / 7);
    const charge = dailyRate * (days - freeDays);
    return charge;
}

// scan for form elements that contain a "data-has" attribute
function registerFormActions() {
    const forms = document.querySelectorAll('form[data-has]');
    forms.forEach(form => {
        // scan for form elements that contain a "data-action" attribute
        const actions = form.querySelectorAll('[data-action]');
        actions.forEach(action => {
            // get the action from the element
            const actionNames = action.getAttribute('data-action');
            if (!actionNames) throw new Error('data-action attribute is required');

            actionNames.split(' ').forEach(actionName => {
                // get the event name from actionName prefix (":")
                const eventName = actionName.split(':')[0];
                action.addEventListener(eventName, (e: Event) => {
                    e.preventDefault();
                    trigger(actionName, e);
                });
            })
        });
    });
}



function trigger(topic: string, e: Event) {
    globalEventManager.trigger(topic, e);
}

function on(topic: string, callback: (e?: Event) => void) {
    globalEventManager.on(topic, callback);
}

function calculateDays(arrivalDate: string, departureDate: string) {
    // how many days between arrival and departure?
    const arrival = new Date(arrivalDate);
    const departure = new Date(departureDate);
    const milliseconds = departure.getTime() - arrival.getTime();
    return Math.round(milliseconds / 1000 / 60 / 60 / 24);
}

function asHtml(html: string) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
}

function log(message: string) {
    console.log(message);
}

function range(size: number) {
    return [...Array(size).keys()];
}

function interpolateDates(start: string, end: string) {
    const startDate = new Date(start);
    const days = calculateDays(start, end);
    return range(days).map((_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        // yyyy-mm-dd format
        return date.toISOString().split('T')[0];
    });
}

function isAvailable(availableDates: string[], dateRange: { arrivalDate: string; departureDate: string; }) {
    const dates = interpolateDates(dateRange.arrivalDate, dateRange.departureDate);
    return dates.every(date => availableDates.includes(date));
}

function addDay(arrivalDateValue: string, days = 1) {
    const arrivalDate = new Date(arrivalDateValue);
    arrivalDate.setDate(arrivalDate.getDate() + days);
    return arrivalDate.toISOString().split('T')[0];
}

function asUsd(value: number) {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    return formatter.format(value).replace('.00', '');
}

function initializationComplete() {
    document.querySelectorAll(".if-init").forEach(element => element.classList.toggle('if-init', false));
}
