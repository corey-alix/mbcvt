export function setupReservationForm() {
    registerFormActions();
    on('input:show-site', () => {
        const siteNumber = document.querySelector<HTMLInputElement>('#site')?.value;
        if (!siteNumber) return;

        const sitePreviewImg = document.querySelector<HTMLImageElement>('#site-preview-img');
        if (!sitePreviewImg) return;

        // pad the site number to two digits
        const siteNumberPadded = siteNumber.padStart(2, '0');
        const url = `../assets/site_${siteNumberPadded}.jpg`;
        sitePreviewImg.src = url;
    });

    on('click:compute', compute);
    on('input:compute', compute);

    function compute() {
        const form = document.querySelector<HTMLFormElement>('form[data-has]');
        if (!form) throw new Error('form is required');

        const formValues = new FormData(form);
        const siteNumber = formValues.get('site');
        if (!siteNumber) throw new Error('site number is required');

        const arrivalDate = formValues.get('arrival');
        if (!arrivalDate) throw new Error('arrival date is required');

        const departureDate = formValues.get('departure');
        if (!departureDate) throw new Error('departure date is required');

        const days = calculateDays(arrivalDate.toString(), departureDate.toString());
        if (days < 1) throw new Error('departure date must be after arrival date');

        const dailyRate = 28;
        const total = days * dailyRate;
        const totalElement = form.querySelector<HTMLInputElement>('#total');
        if (!totalElement) throw new Error('#total element is required');

        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
        const totalFormatted = formatter.format(total);
        totalElement.value = totalFormatted;
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
    #queue: Array<() => void> = [];
    on(topic: string, callback: () => void) {
        this.#queue.push(callback);
    }
    trigger(topic: string) {
        this.#queue.forEach(callback => callback());
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
    const days = Math.round(milliseconds / 1000 / 60 / 60 / 24);
    return days + 1;
}
