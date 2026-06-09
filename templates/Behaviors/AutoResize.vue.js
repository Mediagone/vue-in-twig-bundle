VUE_APP.component('vue-auto-resize', {
    render() {
        return this.$slots.default ? this.$slots.default()[0] : null;
    },
    mounted() {
        this.$nextTick(() => {
            this.$el.setAttribute('style', 'height:' + (this.$el.scrollHeight + 5) + 'px; overflow-y:hidden; resize:none;');
        });
        this.$el.addEventListener('input', this.resizeContent);
        window.addEventListener('resize', this.resizeContent);
        this.resizeContent();
    },
    beforeUnmount() {
        this.$el.removeEventListener('input', this.resizeContent);
        window.removeEventListener('resize', this.resizeContent);
    },
    updated() {
        this.resizeContent();
    },
    methods: {
        resizeContent() {
            this.$el.style.height = 'auto';
            this.$el.style.height = this.$el.scrollHeight + 'px';
        },
    },
});