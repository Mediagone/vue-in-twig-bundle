VUE_APP.component('vue-datalist', {
    props: {
        itemsListUrl:   { type: String, required: true },
        itemsCreateUrl: { type: String, default: '' },
        itemsDeleteUrl: { type: String, default: '' },
        page:           { type: Number, default: 1 },
        // Per-instance config override, merged over VUE_CONFIG.DataList (same shape):
        // { parseResponse, parseErrorResponse, icons }.
        config: { type: Object, default: () => ({}) },
    },
    data() {
        return {
            isBusy: false,
            items: [],
            modal: null,
            columnsCount: 0,
            pageCount: 1,
            itemsCountTotal: 0,
        };
    },
    created() {
        // Call this.debounceRefresh() in your child component's functions (e.g. filter/search  watchers) to refresh the list with debounce.
        this.debounceRefresh = debounce(this.itemsRefresh, VUE_CONFIG.debounceSearch);
    },
    mounted() {
        this.columnsCount = this.$refs.dataTableHeader ? this.$refs.dataTableHeader.children.length : 0;
        this.itemsRefresh();
    },
    computed: {
        // Icon markup: built-in defaults < dataListConfig().icons (global + per-instance config, merged per-key).
        resolvedIcons() {
            const defaults = {
                refresh: '↻',
                first:   '|<',
                prev10:  '<<',
                prev:    '<',
                next:    '>',
                next10:  '>>',
                last:    '>|',
            };
            return { ...defaults, ...(this.dataListConfig().icons || {}) };
        },
        // UI text strings: built-in defaults < dataListConfig().texts (global + per-instance config, merged per-key).
        resolvedTexts() {
            const defaults = {
                loading:       'Loading...',
                results_none:  'No results',
                results_total: 'result(s) displayed out of',
                page:          'Page',
            };
            return { ...defaults, ...(this.dataListConfig().texts || {}) };
        },
        // Button title (tooltip) text: built-in defaults < dataListConfig().tooltips (global + per-instance config, merged per-key).
        resolvedTooltips() {
            const defaults = {
                refresh: 'Refresh list',
                first:   'First page',
                prev10:  'Previous page -10',
                prev:    'Previous page',
                next:    'Next page',
                next10:  'Next page +10',
                last:    'Last page',
            };
            return { ...defaults, ...(this.dataListConfig().tooltips || {}) };
        },
    },
    methods: {
        itemsRefresh() {
            if (this.itemsListUrl === '' || this.isBusy) return;
            this.isBusy = true;

            let url = this.itemsListUrl;

        let params = [];
            this.modifyUrlParameters(params);
            if (this.pageCount > 1) {
                params.push('page=' + this.page);
            }
            if (params.length > 0) {
                url += (url.indexOf('?') === -1 ? '?' : '&') + params.join('&');
            }

            axios.get(url)
                .then(response => {
                    this.isBusy = false;
                    const r = this.parseResponse(response);
                    this.items = r.items;
                    this.page = r.page;
                    this.pageCount = r.pageCount;
                    this.itemsCountTotal = r.total;
                    this.onItemsRefresh();
                })
                .catch(e => {
                    this.isBusy = false;
                    this.modal = this.buildErrorModal(this.parseErrorResponse(e.response), 'list');
                    this.onItemsRefreshFailure();
                });
        },
        // Overridable hooks (override in the consuming component that extends vue-datalist).
        modifyUrlParameters(params) {},
        onItemsRefresh() {},
        onItemsRefreshFailure() {},

        // Effective config: global (VUE_CONFIG.DataList) overridden per-instance by the `config` prop.
        dataListConfig() {
            const global = (typeof VUE_CONFIG !== 'undefined' && VUE_CONFIG.DataList) || {};
            const merged = { ...global, ...this.config };
            // icons/tooltips are maps → merge per-key, so a partial per-instance override keeps the others.
            merged.icons    = { ...(global.icons    || {}), ...(this.config.icons    || {}) };
            merged.tooltips = { ...(global.tooltips || {}), ...(this.config.tooltips || {}) };
            merged.texts    = { ...(global.texts    || {}), ...(this.config.texts    || {}) };
            return merged;
        },
        // Parses the error { code, description } from the (failed) response — API-specific.
        // Default: VUE_CONFIG.DataList.parseErrorResponse if set, else the easy-api shape.
        parseErrorResponse(response) {
            const func = this.dataListConfig().parseErrorResponse;
            if (typeof func === 'function') return func(response);

            const d = (response && response.data) || {};
            return { code: d.error, description: d.errorDescription };
        },
        // Builds the error-modal object from the extracted error — the DISPLAY (shape-independent).
        // Override per list for conditional title/description (switch on error.code). |trans works here.
        buildErrorModal(error, context) {
            return {
                name: 'error',
                title: 'Une erreur est survenue',
                description: error.description || 'Une erreur inattendue est survenue (réponse serveur invalide).',
            };
        },

        // Row identity & attributes (overridable). rowKey defaults to the item's id (or the item
        // itself for primitives); rowAttributes can add class / HTML attributes / event listeners
        // (onClick, ...) to the <tr>.
        rowKey(row) { return row.id ?? row; },
        rowAttributes(row) { return {}; },

        // Parses the (successful) response into { items, page, pageCount, total } — API-specific.
        // Default: VUE_CONFIG.DataList.parseResponse if set, else the easy-api shape (response.data.payload).
        parseResponse(response) {
            const func = this.dataListConfig().parseResponse;
            if (typeof func === 'function') return func(response);

            const d = (response.data && response.data.payload) || {};
            return { items: d.results, page: d.page, pageCount: d.pageCount, total: d.resultsCountTotal };
        },

        itemsCreate(data) {
            if (this.itemsCreateUrl === '' || this.isBusy) return;
            this.isBusy = true;

            let postData = new FormData();
            for (let [key, value] of Object.entries(data)) {
                postData.append(key, value);
            }

            axios.post(this.itemsCreateUrl, postData)
                .then(response => {
                    this.isBusy = false;
                    this.itemsRefresh();
                })
                .catch(e => {
                    this.isBusy = false;
                    this.modal = this.buildErrorModal(this.parseErrorResponse(e.response), 'create');
                });
        },

        itemsDelete(itemId, data) {
            if (this.itemsDeleteUrl === '' || this.isBusy) return;
            this.isBusy = true;

            let postData = Object.keys(data).map(key => key + '=' + data[key]).join('&');
            const url = this.itemsDeleteUrl.replace('-ID-', itemId) + (postData ? '?' + postData : '');

            axios.delete(url)
                .then(response => {
                    this.isBusy = false;
                    this.itemsRefresh();
                })
                .catch(e => {
                    this.isBusy = false;
                    this.modal = this.buildErrorModal(this.parseErrorResponse(e.response), 'delete');
                });
        },

        close() {
            this.modal = null;
        },

        pageDown() {
            if (this.page > 1) {
                this.page -= 1;
                this.itemsRefresh();
            }
        },
        pageDown10() {
            this.page -= 10;
            if (this.page < 1) this.page = 1;
            this.itemsRefresh();
        },
        pageUp() {
            if (this.page < this.pageCount) {
                this.page += 1;
                this.itemsRefresh();
            }
        },
        pageUp10() {
            this.page += 10;
            if (this.page > this.pageCount) this.page = this.pageCount;
            this.itemsRefresh();
        },
        pageFirst() {
            if (this.page > 1) {
                this.page = 1;
                this.itemsRefresh();
            }
        },
        pageLast() {
            if (this.page < this.pageCount) {
                this.page = this.pageCount;
                this.itemsRefresh();
            }
        },
        checkPage() {
            if (this.page < 1) this.page = 1;
            else if (this.page > this.pageCount) this.page = this.pageCount;
            this.itemsRefresh();
        },
    },
});
