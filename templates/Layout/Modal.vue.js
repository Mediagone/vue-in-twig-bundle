VUE_APP.component('vue-modal', {
    template: '#vue-modal',
    emits: ['clickyes', 'clickno'],
    props: {
        titleText:        { type: String,  default: '' },
        titleStyle:       { type: String,  default: '' },
        yesButtonText:    { type: String,  default: '' },
        yesButtonClass:   { type: String,  default: '--primary' },
        noButtonText:     { type: String,  default: '' },
        noButtonClass:    { type: String,  default: '' },
        yesButtonEnabled: { type: Boolean, default: true },
        noButtonEnabled:  { type: Boolean, default: true },
    },
});
