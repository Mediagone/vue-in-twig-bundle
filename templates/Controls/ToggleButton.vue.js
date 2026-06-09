VUE_APP.component('vue-togglebutton', {
    template: '#vue-togglebutton',
    props: {
        api_url:         { type: String,  required: true },
        result_name:     { type: String,  required: true },
        result_property: { type: String,  required: true },
        value_on:        { type: String,  default: '1' },
        value_off:       { type: String,  default: '0' },
        confirm_on:      { type: String,  default: '' },
        confirm_off:     { type: String,  default: '' },
        disabled:        { type: Boolean, default: false },
    },
    data() {
        return {
            value: '',
            isBusy: false,
        };
    },
    created() {
        this.initialize();
    },
    methods: {
        initialize() {
            this.isBusy = true;
            axios.get(this.api_url + '?fields=' + this.result_property)
                .then(response => {
                    this.value = response.data.results[this.result_name][this.result_property].toString();
                })
                .finally(() => {
                    this.isBusy = false;
                });
        },
        clicked() {
            if (this.isBusy) return;

            const isOn = this.value === this.value_on;
            const confirmMessage = isOn ? this.confirm_off : this.confirm_on;
            if (confirmMessage && !confirm(confirmMessage)) return;

            this.isBusy = true;
            const data = new FormData();
            data.set(this.result_property, isOn ? this.value_off : this.value_on);

            axios.post(this.api_url + '?fields=' + this.result_property, data)
                .then(response => {
                    this.value = response.data.results[this.result_name][this.result_property].toString();
                })
                .finally(() => {
                    this.isBusy = false;
                });
        },
    },
});