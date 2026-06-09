VUE_APP.component('vue-datetime-picker', {
    template: '#vue-datetime-picker',
    emits: ['dateSelected'],
    props: {
        initialDate:    { type: Date,    required: true },
        showAllMinutes: { type: Boolean, default: false },
        futureDateText: { type: String,  default: '' },
        pastDateText:   { type: String,  default: '' },
        useTime:        { type: Boolean, default: true },
        yearsList:      { type: Array,   default: null },
        yearsBefore:    { type: Number,  default: 2 },
        yearsAfter:     { type: Number,  default: 3 },
    },
    data() {
        return {
            availableYears:   [],
            availableMonths:  [1,2,3,4,5,6,7,8,9,10,11,12],
            availableDays:    [],
            availableHours:   Array.from({ length: 24 }, (_, i) => i),
            availableMinutes: [0,5,10,15,20,25,30,35,40,45,50,55],
            selectedYear:     null,
            selectedMonth:    null,
            selectedDay:      null,
            selectedHour:     8,
            selectedMinute:   0,
            selectedDate:     null,
        };
    },
    created() {
        this.availableYears = this.yearsList ?? (() => {
            const current = new Date().getFullYear();
            const years = [];
            for (let y = current - this.yearsBefore; y <= current + this.yearsAfter; y++) years.push(y);
            return years;
        })();
        if (this.showAllMinutes) {
            this.availableMinutes = Array.from({ length: 60 }, (_, i) => i);
        } else {
            const mins = this.initialDate.getMinutes();
            this.initialDate.setMinutes(Math.round(mins / 5) * 5);
        }
        this.updateDaysList();
        this.selectedYear   = this.initialDate.getFullYear();
        this.selectedMonth  = this.initialDate.getMonth() + 1;
        this.selectedDay    = this.initialDate.getDate();
        this.selectedHour   = this.initialDate.getHours();
        this.selectedMinute = this.initialDate.getMinutes();
        this.generateDate();
    },
    computed: {
        isSelectedDateExpired() { return this.selectedDate < new Date(); },
        isSelectedDateFuture()  { return this.selectedDate > new Date(); },
    },
    watch: {
        selectedYear()   { this.updateDaysList(); this.generateDate(); },
        selectedMonth()  { this.updateDaysList(); this.generateDate(); },
        selectedDay()    { this.generateDate(); },
        selectedHour()   { this.generateDate(); },
        selectedMinute() { this.generateDate(); },
    },
    methods: {
        updateDaysList() {
            const count = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
            this.availableDays = Array.from({ length: count }, (_, i) => i + 1);
            if (this.selectedDay > count) this.selectedDay = count;
        },
        generateDate() {
            const date = new Date();
            date.setFullYear(this.selectedYear);
            date.setMonth(this.selectedMonth - 1);
            date.setDate(this.selectedDay);
            date.setHours(this.useTime ? this.selectedHour : 0);
            date.setMinutes(this.useTime ? this.selectedMinute : 0);
            date.setSeconds(0);
            date.setMilliseconds(0);
            this.selectedDate = date;
            this.$emit('dateSelected', this.selectedDate);
        },
    },
});
