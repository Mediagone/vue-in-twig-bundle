window.VUE_CONFIG ??= { debounceSearch: 300 };

VUE_APP.config.compilerOptions.delimiters = ['[[', ']]'];

VUE_APP.mixin({
    methods: {
        format_date(value, locale, options) {
            if (!value) return '';
            return new Intl.DateTimeFormat(locale ?? document.documentElement.lang, options).format(new Date(value));
        },
        slugify(str) {
            return str.toLowerCase().trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },
    },
});