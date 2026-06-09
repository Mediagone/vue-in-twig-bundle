VUE_APP.component('vue-lock-wrapper', {
    template: '#vue-lock-wrapper',
    data() {
        return {
            locked: true,
        };
    },
    methods: {
        lock()   { this.locked = true; },
        unlock() { this.locked = false; },
        toggle() { this.locked = !this.locked; },
    },
});
