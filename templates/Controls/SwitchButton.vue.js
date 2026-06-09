VUE_APP.component('vue-switch-button', {
    template: '#vue-switch-button',
    emits: ['switch-request'],
    props: {
        object:    { type: Object,  required: true },
        property:  { type: String,  required: true },
        valueOn:  { type: String,  required: true },
        valueOff: { type: String,  required: true },
        disabled:  { type: Boolean, default: false },
    },
    methods: {
        clicked() {
            if (this.disabled) return;
            this.$emit('switch-request', this.object[this.property] === this.valueOn ? this.valueOff : this.valueOn);
        },
    },
});