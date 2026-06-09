VUE_APP.component('vue-date-picker', {
    template: '#vue-date-picker',
    emits: ['dateSelected'],
    props: {
        initialDate:  { type: Date,   required: true },
        yearsBefore:  { type: Number, default: 2 },
        yearsAfter:   { type: Number, default: 3 },
        yearsList:    { type: Array,  default: null },
    },
    data() {
        return {
            availableYears:  [],
            availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
            availableDays:   [],
            selectedYear:    null,
            selectedMonth:   null,
            selectedDay:     null,
            selectedDate:    null,
        };
    },
    created() {
        this.availableYears = this.yearsList ?? (() => {
            const current = new Date().getFullYear();
            const years = [];
            for (let y = current - this.yearsBefore; y <= current + this.yearsAfter; y++) years.push(y);
            return years.reverse();
        })();
        this.updateDaysList();
        this.selectedYear  = this.initialDate.getFullYear();
        this.selectedMonth = this.initialDate.getMonth() + 1;
        this.selectedDay   = this.initialDate.getDate();
        this.generateDate();
    },
    watch: {
        selectedYear()  { this.updateDaysList(); this.generateDate(); },
        selectedMonth() { this.updateDaysList(); this.generateDate(); },
        selectedDay()   { this.generateDate(); },
    },
    methods: {
        updateDaysList() {
            const count = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
            this.availableDays = Array.from({ length: count }, (_, i) => i + 1);
            if (this.selectedDay > count) this.selectedDay = count;
        },
        generateDate() {
            const date = new Date();
            date.setUTCFullYear(this.selectedYear);
            date.setUTCMonth(this.selectedMonth - 1);
            date.setUTCDate(this.selectedDay);
            date.setUTCHours(0, 0, 0, 0);
            this.selectedDate = date;
            this.$emit('dateSelected', this.selectedDate);
        },
    },
});
