export function setupReservationForm() {
    registerFormActions();
    on('input:show-site', () => {
        const siteNumber = document.querySelector<HTMLInputElement>('#site')?.value;
        if (!siteNumber) return;
        alert(`showing site ${siteNumber}`);
    });
}

// scan for form elements that contain a "data-has" attribute
function registerFormActions() {
    const forms = document.querySelectorAll('form[data-has]');
    forms.forEach(form => {
        // scan for form elements that contain a "data-action" attribute
        const actions = form.querySelectorAll('[data-action]');
        actions.forEach(action => {
            // get the action from the element
            const actionName = action.getAttribute('data-action');
            if (!actionName) throw new Error('data-action attribute is required');

            // get the event name from actionName prefix (":")
            const eventName = actionName.split(':')[0];
            action.addEventListener(eventName, (e: Event) => {
                trigger(actionName);
            });
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
    console.log(`triggering ${topic}`);
    globalEventManager.trigger(topic);
}

function on(topic: string, callback: () => void) {
    globalEventManager.on(topic, callback);
}