window.VUE_CONFIG ??= { debounceSearch: 300 };

window.debounce ??= (fn, ms) => {
    let timer;
    return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
};

VUE_APP.config.compilerOptions.delimiters = ['[[', ']]'];

VUE_APP.mixin({
    methods: {
        format_date(value, locale, options) {
            if (!value) return '';
            return new Intl.DateTimeFormat(locale ?? document.documentElement.lang, options).format(new Date(value));
        },
        month_name(month) {
            return new Intl.DateTimeFormat(document.documentElement.lang, { month: 'long' })
                .format(new Date(2000, month - 1, 1));
        },
        slugify(str) {
            return str.toLowerCase().trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        },
    },
});