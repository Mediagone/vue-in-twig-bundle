VUE_APP.component('vue-drop-zone', {
    template: '#vue-drop-zone',
    emits: ['select'],
    props: {
        title:          { type: String, required: true },
        selectionLimit: { type: Number, default: 0 },
        fileMaxSize:    { type: Number, default: 0 },
        fileMimeTypes:  { type: String, default: '' },
    },
    data() {
        return {
            fileInput: null,
            dragData: null,
            isDragZoneHovered: false,
            modal: null,
        };
    },
    computed: {
        isValidDropTarget() {
            if (!this.dragData) return false;
            for (const item of this.dragData.items) {
                if (!this.checkFileType(item)) return false;
            }
            return true;
        },
        infosFormats() {
            return this.fileMimeTypes.split(',').map(m => this.mimeToExtension(m)).join(', ');
        },
        infosMaxSize() {
            return this.formatByteSize(this.fileMaxSize);
        },
    },
    mounted() {
        document.body.addEventListener('dragover',  this.onBodyDrag);
        document.body.addEventListener('dragleave', this.onBodyDragEnd);
        document.body.addEventListener('drop',      this.onBodyDragEnd);

        this.fileInput = document.createElement('input');
        this.fileInput.type     = 'file';
        this.fileInput.multiple = this.selectionLimit > 1;
        this.fileInput.accept   = this.fileMimeTypes;
        this.fileInput.addEventListener('change', this.onFileInputSelected);
    },
    beforeUnmount() {
        document.body.removeEventListener('dragover',  this.onBodyDrag);
        document.body.removeEventListener('dragleave', this.onBodyDragEnd);
        document.body.removeEventListener('drop',      this.onBodyDragEnd);
        this.fileInput.removeEventListener('change', this.onFileInputSelected);
    },
    methods: {
        onBodyDrag(e) {
            this.dragData = e.dataTransfer;
            e.preventDefault();
            e.stopPropagation();
        },
        onBodyDragEnd(e) {
            this.dragData = null;
            e.preventDefault();
            e.stopPropagation();
        },
        onZoneDrag(e) {
            this.isDragZoneHovered = true;
            e.dataTransfer.dropEffect = this.isValidDropTarget ? 'copy' : 'none';
        },
        onZoneLeave(e) {
            this.isDragZoneHovered = false;
            e.dataTransfer.dropEffect = 'none';
        },
        onZoneDrop(e) {
            this.selectFiles(e.dataTransfer.files);
            this.onZoneLeave(e);
        },
        onFileInputSelected(e) {
            this.selectFiles(e.target.files);
        },
        selectFiles(droppedFiles) {
            const files = [];
            for (const file of droppedFiles) {
                if (!this.checkFileType(file)) {
                    files.push({ file, error: 'type_not_allowed' });
                } else if (!this.checkFileSize(file)) {
                    files.push({ file, error: 'size_too_big' });
                } else if (this.selectionLimit > 0 && files.filter(f => !f.error).length >= this.selectionLimit) {
                    files.push({ file, error: 'selection_limit_reached' });
                } else {
                    files.push({ file });
                }
            }
            this.modal = { name: 'preview', files };
        },
        emitFiles(files) {
            this.$emit('select', files.filter(f => !f.error).map(f => f.file));
        },
        checkFileType(file) {
            return this.fileMimeTypes === '' || this.fileMimeTypes.split(',').includes(file.type);
        },
        checkFileSize(file) {
            return this.fileMaxSize === 0 || file.size <= this.fileMaxSize;
        },
        formatByteSize(bytes, decimals = 0) {
            if (!bytes) return '0 o';
            const k = 1024;
            const sizes = ['o', 'Ko', 'Mo', 'Go'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
        },
        mimeToExtension(mime) {
            const map = {
                'image/jpeg': 'jpg', 'image/svg+xml': 'svg',
                'video/mpeg': 'mp4', 'audio/mpeg': 'mp3',
                'application/x-zip-compressed': 'zip', 'text/plain': 'txt',
            };
            return map[mime] ?? mime.split('/')[1];
        },
    },
});