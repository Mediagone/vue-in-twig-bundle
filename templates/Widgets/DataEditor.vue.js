VUE_APP.component('vue-data-editor', {
    template: '#vue-data-editor',
    props: {
        item:               { type: Object,          required: true },
        postUrl:            { type: [String, Function], required: true },
        postUrlProperties:  { type: String,          required: true },
        // Optional dot-path within response.data pointing to the saved entity, used to sync
        // item from the server (e.g. "results.portal"). Omit it to stay API-shape-agnostic.
        resultPath:         { type: String,          default: null },
        // Text shown when the item is up to date. Empty → the "up to date" panel stays hidden
        // (so the save bar only draws attention when there are changes).
        upToDateText:       { type: String,          default: '' },
    },
    data() {
        return {
            originalItem:  JSON.parse(JSON.stringify(this.item)),
            referenceData: null,
            canSave:       false,
            isBusy:        false,
            modal:         null,
        };
    },
    mounted() {
        this.init();
        this.checkForSave();
    },
    methods: {
        init() {
            this.referenceData = JSON.stringify(this.item);
            this.originalItem  = JSON.parse(this.referenceData);
        },
        checkForSave() {
            this.canSave = this.referenceData !== JSON.stringify(this.item);
        },
        // Resolves a dot-path (e.g. "results.portal") within an object; undefined if absent.
        getByPath(obj, path) {
            return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
        },
        save() {
            if (this.isBusy) return;
            this.isBusy = true;

            const data               = new FormData();
            const updatableProperties = this.postUrlProperties.split(',');
            for (const [key, value] of Object.entries(this.item)) {
                if (updatableProperties.includes(key)) {
                    data.set(key, value === null ? '' : value);
                }
            }

            const url = (typeof this.postUrl === 'function') ? this.postUrl(this.item) : this.postUrl;
            axios.post(url, data)
                .then(response => {
                    // Optionally sync item from the server response at the configured path
                    // (e.g. "results.portal"). No path / not found → just re-init, so the
                    // component stays agnostic of the API's response shape.
                    const result = this.resultPath ? this.getByPath(response.data, this.resultPath) : null;
                    if (result) {
                        for (const [key] of Object.entries(this.item)) {
                            if (key in result) {
                                this.item[key] = result[key];
                            } else {
                                delete this.item[key];
                            }
                        }
                    }
                    this.init();
                    this.checkForSave();
                })
                .catch(e => {
                    this.modal = {
                        name:  'error',
                        error: {
                            name:        e.response.data.error,
                            description: e.response.data.error_description,
                        },
                    };
                })
                .finally(() => {
                    this.isBusy = false;
                });
        },
    },
});