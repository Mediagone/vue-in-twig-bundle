VUE_APP.component('vue-tabpanel', {
    template: '#vue-tabpanel',
    emits: ['change'],
    props: {
        active: { type: String, default: '' },
    },
    data() {
        return {
            pages: [],
            // 0 means "no user selection yet, follow the `active` prop"
            selectedIndex: 0,
        };
    },
    computed: {
        activeIndex() {
            if (this.selectedIndex) {
                return this.selectedIndex;
            }
            const index = this.pages.findIndex(page => page.key === this.active);
            return index === -1 ? 1 : index + 1;
        },
    },
    provide() {
        return { tabPanel: this };
    },
    methods: {
        registerPage(page) {
            this.pages.push(page);
        },
        unregisterPage(page) {
            const index = this.pages.indexOf(page);
            if (index !== -1) {
                this.pages.splice(index, 1);
            }
            if (this.selectedIndex > this.pages.length) {
                this.selectedIndex = 0;
            }
        },
        activate(index) {
            this.selectedIndex = index;
            const page = this.pages[index - 1];
            this.$emit('change', page ? page.key : null);
        },
        isActive(index) {
            return this.activeIndex === index;
        },
    },
});

VUE_APP.component('vue-tabpanel-page', {
    template: '#vue-tabpanel-page',
    inject: ['tabPanel'],
    props: {
        title: { type: String, required: true },
        name:  { type: String, default: '' },
    },
    computed: {
        key() {
            return this.name || this.title;
        },
        index() {
            return this.tabPanel.pages.indexOf(this) + 1;
        },
        isActive() {
            return this.tabPanel.isActive(this.index);
        },
    },
    created() {
        this.tabPanel.registerPage(this);
    },
    unmounted() {
        this.tabPanel.unregisterPage(this);
    },
});
