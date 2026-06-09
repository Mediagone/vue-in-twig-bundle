VUE_APP.component('vue-image-cropper', {
    template: '#vue-image-cropper',
    emits: ['cropped'],
    props: {
        sourceDataUrl:    { type: String,  required: true },
        outputWidth:      { type: Number,  default: 0 },
        outputHeight:     { type: Number,  default: 0 },
        outputMimeFormat: { type: String,  default: '' },
        fixedRatio:       { type: Boolean, default: false },
    },
    data() {
        return {
            canvas: null,
            cropX: 0,
            cropY: 0,
            cropWidth: 0,
            cropHeight: 0,
            cropAction: null,
            containerWidth: 0,
            containerHeight: 0,
            outputRatio: 1,
        };
    },
    computed: {
        cssCropAreaHeight()    { return (this.cropHeight / this.containerHeight * 100) + '%'; },
        cssCropAreaWidth()     { return (this.cropWidth  / this.containerWidth  * 100) + '%'; },
        cssCropAreaTranslate() { return 'translate(' + this.cropX + 'px,' + this.cropY + 'px)'; },
        sourceMimeFormat() {
            if (this.sourceDataUrl === '') return null;
            return this.sourceDataUrl.split(',')[0].match(/:(.*?);/)[1];
        },
    },
    mounted() {
        this.canvas = document.createElement('canvas');
        this.$refs.image.onload = this.onImageLoaded;
    },
    methods: {
        onImageLoaded() {
            this.containerWidth  = this.$refs.container.clientWidth;
            this.containerHeight = this.$refs.container.clientHeight;

            this.outputRatio = (this.outputWidth && this.outputHeight) ? (this.outputWidth / this.outputHeight) : 1;
            this.cropHeight  = Math.min(this.containerHeight, this.containerWidth / this.outputRatio);
            this.cropWidth   = this.cropHeight * this.outputRatio;
            this.cropX       = (this.containerWidth  - this.cropWidth)  / 2;
            this.cropY       = (this.containerHeight - this.cropHeight) / 2;

            this.updateData();
        },
        onMouseDown(e) {
            this.cropAction = e.target.dataset.cropperAction;
            document.body.addEventListener('mousemove', this.onMouseMove);
            document.body.addEventListener('mouseup',   this.onMouseUp);
        },
        onMouseUp() {
            this.cropAction = null;
            document.body.removeEventListener('mousemove', this.onMouseMove);
            document.body.removeEventListener('mouseup',   this.onMouseUp);
            this.updateData();
        },
        onMouseMove(e) {
            const container  = this.$refs.container;
            const movementX  = e.movementX;
            let   movementY  = e.movementY;
            const fixedRatio = this.fixedRatio || e.shiftKey;

            switch (this.cropAction) {
                case 'move': {
                    this.cropX = Math.max(0, Math.min(container.clientWidth  - this.cropWidth,  this.cropX + movementX));
                    this.cropY = Math.max(0, Math.min(container.clientHeight - this.cropHeight, this.cropY + movementY));
                    break;
                }
                case 'nw': {
                    movementY = -Math.min(-movementY, this.cropX / this.outputRatio);
                    const constantY_nw = this.cropY + this.cropHeight;
                    this.cropY      = Math.min(constantY_nw - 20, Math.max(0, this.cropY + movementY));
                    this.cropHeight = constantY_nw - this.cropY;
                    const constantX_nw = this.cropX + this.cropWidth;
                    if (fixedRatio) {
                        this.cropWidth = this.cropHeight * this.outputRatio;
                        this.cropX     = constantX_nw - this.cropWidth;
                    } else {
                        this.cropX     = Math.min(constantX_nw - 20, Math.max(0, this.cropX + movementX));
                        this.cropWidth = constantX_nw - this.cropX;
                    }
                    break;
                }
                case 'n': {
                    const constantY_n = this.cropY + this.cropHeight;
                    this.cropY      = Math.min(constantY_n - 20, Math.max(0, this.cropY + movementY));
                    this.cropHeight = Math.max(20, constantY_n - this.cropY);
                    break;
                }
                case 'ne': {
                    movementY = -Math.min(-movementY, (container.clientWidth - this.cropWidth - this.cropX) / this.outputRatio);
                    const constantY_ne = this.cropY + this.cropHeight;
                    this.cropY      = Math.min(constantY_ne - 20, Math.max(0, this.cropY + movementY));
                    this.cropHeight = constantY_ne - this.cropY;
                    if (fixedRatio) {
                        this.cropWidth = this.cropHeight * this.outputRatio;
                    } else {
                        this.cropWidth = Math.max(20, Math.min(container.clientWidth - this.cropX, this.cropWidth + movementX));
                    }
                    break;
                }
                case 'e': {
                    this.cropWidth = Math.max(20, Math.min(container.clientWidth - this.cropX, this.cropWidth + movementX));
                    break;
                }
                case 'se': {
                    movementY = Math.min(movementY, (container.clientWidth - this.cropWidth - this.cropX) / this.outputRatio);
                    this.cropHeight = Math.max(20, Math.min(container.clientHeight - this.cropY, this.cropHeight + movementY));
                    if (fixedRatio) {
                        this.cropWidth = this.cropHeight * this.outputRatio;
                    } else {
                        this.cropWidth = Math.max(20, Math.min(container.clientWidth - this.cropX, this.cropWidth + movementX));
                    }
                    break;
                }
                case 's': {
                    this.cropHeight = Math.max(20, Math.min(container.clientHeight - this.cropY, this.cropHeight + movementY));
                    break;
                }
                case 'sw': {
                    const constantX_sw = this.cropX + this.cropWidth;
                    if (fixedRatio) {
                        movementY       = Math.min(movementY, this.cropX / this.outputRatio);
                        this.cropHeight = Math.max(20, Math.min(container.clientHeight - this.cropY, this.cropHeight + movementY));
                        this.cropWidth  = this.cropHeight * this.outputRatio;
                        this.cropX      = constantX_sw - this.cropWidth;
                    } else {
                        this.cropHeight = Math.max(20, Math.min(container.clientHeight - this.cropY, this.cropHeight + movementY));
                        this.cropX      = Math.min(constantX_sw - 20, Math.max(0, this.cropX + movementX));
                        this.cropWidth  = constantX_sw - this.cropX;
                    }
                    break;
                }
                case 'w': {
                    const constantX_w = this.cropX + this.cropWidth;
                    this.cropX     = Math.min(constantX_w - 20, Math.max(0, this.cropX + movementX));
                    this.cropWidth = constantX_w - this.cropX;
                    break;
                }
            }
        },
        updateData() {
            const ratioX = this.$refs.image.naturalWidth  / this.$refs.image.width;
            const ratioY = this.$refs.image.naturalHeight / this.$refs.image.height;

            this.canvas.width  = this.outputWidth  || this.cropWidth  * ratioX;
            this.canvas.height = this.outputHeight || this.cropHeight * ratioY;

            const ctx = this.canvas.getContext('2d');
            ctx.drawImage(this.$refs.image,
                this.cropX * ratioX, this.cropY * ratioY,
                this.cropWidth * ratioX, this.cropHeight * ratioY,
                0, 0, this.canvas.width, this.canvas.height
            );

            switch (this.outputMimeFormat) {
                case 'image/jpg':
                case 'image/jpeg': this.canvas.toBlob(this.dispatchData, 'image/jpeg', 0.80); break;
                case 'image/png':  this.canvas.toBlob(this.dispatchData, 'image/png');        break;
                case '':           this.canvas.toBlob(this.dispatchData, this.sourceMimeFormat); break;
                default: throw { name: 'UnsupportedOutputFormat', message: this.outputMimeFormat + ' MIME format is not supported.' };
            }
        },
        dispatchData(data) {
            this.$emit('cropped', data);
        },
    },
});
