import { officeInfo, siteMap } from "./db.js"

export function setupReservationForm() {
    registerFormActions();

    // insert template values into DOM
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
                trigger('input:show-site');
                trigger('input:compute');
                buttons.forEach(button => button.classList.remove('selected'));
                button.classList.add('selected');
            });
        });

        getFormElements().arrivalDateInput!.valueAsDate = new Date();
        updateDepartureDate();
    }

    function getFormElements() {
        const form = document.querySelector<HTMLFormElement>('form')!;
        return {
            arrivalDateInput: form.querySelector<HTMLInputElement>('#arrival'),
            departureDateInput: form.querySelector<HTMLInputElement>('#departure'),
            daysInput: form.querySelector<HTMLInputElement>('#duration'),
            siteInput: form.querySelector<HTMLInputElement>('#site'),
            totalInput: form.querySelector<HTMLInputElement>('#total'),
        }
    }

    on('click:toggle-full-screen', () => {
        const image = document.querySelector<HTMLImageElement>('#site-preview-img');
        if (!image) return log('image is required');
        image.classList.toggle('full-screen');
    });

    on('input:update-departure-date', () => {
        updateDepartureDate();
        updateAvailableSites();
        compute();
    });

    on('input:show-site', () => {
        const elements = getFormElements();
        const siteNumber = elements.siteInput?.value;
        if (!siteNumber) return;

        const sitePreviewImg = document.querySelector<HTMLImageElement>('#site-preview-img');
        if (!sitePreviewImg) return;

        const siteInfo = siteMap.find(siteInfo => siteInfo.site === parseInt(siteNumber));
        const url = `../assets/site_${siteInfo?.alias}.jpg`;
        sitePreviewImg.src = url;
    });

    on('click:compute', compute);
    on('input:compute', compute);

    on(`input:update-length-of-stay`, () => {
        updateLengthOfStay();
        updateAvailableSites();
        compute();
    });

    function updateLengthOfStay() {
        log('update length of stay')
        const elements = getFormElements();
        const arrivalDate = elements.arrivalDateInput?.value;
        if (!arrivalDate) return log('arrival date is required');
        const departureDate = elements.departureDateInput?.value;
        if (!departureDate) return log('departure date is required');
        const duration = elements.daysInput;
        if (!duration) return log('duration is required');
        duration.value = calculateDays(arrivalDate, departureDate).toString();
    }

    function updateDepartureDate() {
        log('update departure date')
        const elements = getFormElements();
        const arrivalDate = elements.arrivalDateInput?.value;
        if (!arrivalDate) return log('arrival date is required');
        const duration = elements.daysInput?.value;
        if (!duration) return log('duration is required');
        const departureDate = new Date(arrivalDate);
        departureDate.setDate(departureDate.getDate() + parseInt(duration));
        elements.departureDateInput!.valueAsDate = departureDate;
    }

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

        const datesToReserve = interpolateDates(arrivalDate, departureDate);

        const sitesAvailable = sitesAvailableOnArrival.filter(s => datesToReserve.every(date => s.availableDates.includes(date)));

        document.querySelectorAll(".if-no-vacancy").forEach(element => element.classList.toggle('hidden', sitesAvailable.length > 0));

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

        const siteNumber = formElements.siteInput?.value;
        if (siteNumber) {
            const dailyRate = siteMap.find(siteInfo => siteInfo.site === parseInt(siteNumber))?.dailyRate;
            if (!dailyRate) return log('site number is invalid');

            const total = days * dailyRate;
            const totalElement = formElements.totalInput;
            if (!totalElement) return log('total is required');

            const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
            const totalFormatted = formatter.format(total);
            totalElement.value = totalFormatted;
        }

        const otherRates = document.querySelectorAll<HTMLDivElement>('.site-picker-button .rate');
        otherRates.forEach(rate => {
            const siteNumber = rate.closest<HTMLButtonElement>('button.site-picker-button')?.value;
            if (!siteNumber) return log('site number is required');
            const dailyRate = siteMap.find(siteInfo => siteInfo.site === parseInt(siteNumber))?.dailyRate;
            if (!dailyRate) return log('site number is invalid');
            const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
            const totalFormatted = formatter.format(dailyRate * days);
            rate.innerText = totalFormatted;
        });
    }

    function generateSitePicker() {
        return siteMap.map(siteInfo => {
            const { alias, site, power, water, sewer } = siteInfo;
            return `<button class="site-picker-button site_${site}" value="${site}">
            ${site ? `<div class="site-number large">${alias}</div>` : ''}
            <nav class="grid grid-3">
                ${power ? '<div class="power smaller"></div>' : '<div class="nope smaller"></div>'}
                ${water ? '<div class="water smaller"></div>' : '<div class="nope smaller"></div>'}
                ${sewer ? '<div class="sewer smaller"></div>' : '<div class="nope smaller"></div>'}
                <div class="rate smaller span-3">$</div>
            </nav>
            </button>`;
        }).join('');
    }
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
                    trigger(actionName);
                });
            })
        });
    });
}

class EventManager {
    #queue: Record<string, Array<() => void>> = {};
    on(topic: string, callback: () => void) {
        if (!this.#queue[topic]) this.#queue[topic] = [];
        this.#queue[topic].push(callback);
    }
    trigger(topic: string) {
        log(`trigger ${topic}`)
        this.#queue[topic]?.forEach(callback => callback());
    }
}

const globalEventManager = new EventManager();

function trigger(topic: string) {
    globalEventManager.trigger(topic);
}

function on(topic: string, callback: () => void) {
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
