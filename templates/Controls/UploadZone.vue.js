VUE_APP.component('vue-upload-zone', {
    template: '#vue-upload-zone',
    emits: ['uploaded'],
    props: {
        postUrl:           { type: String,  required: true },
        postParameterName: { type: String,  required: true },
        title:             { type: String,  required: true },
        dropText:          { type: String,  required: true },
        allowedFileTypes:  { type: String,  default: '' },
        allowMultipleFiles:{ type: Boolean, default: false },
        maxFileSize:       { type: Number,  default: 0 },
        dropInfoText:      { type: String,  default: '({formats} <= {maxSize})' },

        editorEnabled:      { type: Boolean, default: false },
        editorOutputWidth:  { type: Number,  default: 0 },
        editorOutputHeight: { type: Number,  default: 0 },
        editorOutputFormat: { type: String,  default: '' },
        editorFixedRatio:   { type: Boolean, default: false },

        sendButtonLabel:    { type: String, default: 'Envoyer' },
        cancelButtonLabel:  { type: String, default: 'Annuler' },
        okButtonLabel:      { type: String, default: 'OK' },
        fileTooLargeTitle:  { type: String, default: 'Fichier trop volumineux' },
        fileTooLargeText:   { type: String, default: 'Le fichier "{filename}" ({size}) dépasse la taille autorisée ({maxsize}).' },
        uploadFailureTitle: { type: String, default: 'Erreur lors de l\'envoi' },
        uploadFailureText:  { type: String, default: 'Une erreur est survenue lors de l\'envoi du fichier.' },
    },
    data() {
        return {
            dummyFileInput: null,
            dragData: null,
            isDragZoneHovered: false,
            selectedFiles: [],
            cropperDataUrl: null,
            cropperData: null,
            uploadProgress: 0,
            modalData: null,
        };
    },
    computed: {
        cssProgressWidth() { return this.uploadProgress + '%'; },
        isValidDropTarget() {
            if (!this.dragData) return false;
            if (this.dragData.items.length > 1 && !this.allowMultipleFiles) return false;
            for (const item of this.dragData.items) {
                if (!this.isFileTypeAllowed(item.type)) return false;
            }
            return true;
        },
        yesButtonText()    { return this.uploadProgress ? '' : this.sendButtonLabel; },
        noButtonText()     { return this.uploadProgress ? '' : this.cancelButtonLabel; },
        dropInfoParsedText() {
            return this.dropInfoText
                .replace('{formats}',      this.allowedFormatsText)
                .replace('{outputWidth}',  this.editorOutputWidth)
                .replace('{outputHeight}', this.editorOutputHeight)
                .replace('{maxSize}',      this.formatByteSize(this.maxFileSize));
        },
        allowedFormatsText() {
            return this.allowedFileTypes.split(',').map(m => this.mimeToExtension(m)).join(', ');
        },
    },
    mounted() {
        document.body.addEventListener('dragover',  this.onBodyDrag);
        document.body.addEventListener('dragleave', this.onBodyDragEnd);
        document.body.addEventListener('drop',      this.onBodyDragEnd);

        this.dummyFileInput          = document.createElement('input');
        this.dummyFileInput.type     = 'file';
        this.dummyFileInput.multiple = this.allowMultipleFiles;
        this.dummyFileInput.accept   = this.allowedFileTypes;
        this.dummyFileInput.addEventListener('change', this.onBrowseFileSelected);
    },
    beforeUnmount() {
        document.body.removeEventListener('dragover',  this.onBodyDrag);
        document.body.removeEventListener('dragleave', this.onBodyDragEnd);
        document.body.removeEventListener('drop',      this.onBodyDragEnd);
        this.dummyFileInput.removeEventListener('change', this.onBrowseFileSelected);
    },
    methods: {
        mimeToExtension(mime) {
            const map = {
                'image/jpeg': 'jpg', 'image/svg+xml': 'svg',
                'video/mpeg': 'mp4', 'audio/mpeg': 'mp3',
                'application/x-zip-compressed': 'zip', 'text/plain': 'txt',
            };
            return map[mime] ?? mime.split('/')[1];
        },
        isFileTypeAllowed(fileType) {
            return this.allowedFileTypes === '' || this.allowedFileTypes.split(',').includes(fileType);
        },
        formatByteSize(bytes, decimals = 0) {
            if (!bytes) return '0 o';
            const k     = 1024;
            const sizes = ['o', 'Ko', 'Mo', 'Go'];
            const i     = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
        },
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
            this.isDragZoneHovered        = true;
            e.dataTransfer.dropEffect = this.isValidDropTarget ? 'copy' : 'none';
        },
        onZoneLeave(e) {
            this.isDragZoneHovered        = false;
            e.dataTransfer.dropEffect = 'none';
        },
        onZoneDrop(e) {
            this.selectFiles(e.dataTransfer.files);
            this.onZoneLeave(e);
        },
        onBrowseFileSelected(e) {
            this.selectFiles(e.target.files);
        },
        onImageCropped(data) {
            this.cropperData = data;
        },
        selectFiles(files) {
            this.selectedFiles  = [];
            this.cropperDataUrl = null;

            for (const f of files) {
                if (!this.isFileTypeAllowed(f.type)) {
                    continue;
                }
                if (this.maxFileSize > 0 && f.size > this.maxFileSize) {
                    this.modalData = {
                        title:  this.fileTooLargeTitle,
                        text:   this.fileTooLargeText
                            .replace('{filename}', f.name)
                            .replace('{size}',     this.formatByteSize(f.size, 1))
                            .replace('{maxsize}',  this.formatByteSize(this.maxFileSize)),
                        button: this.okButtonLabel,
                    };
                } else {
                    this.loadFile(f);
                }
                if (!this.allowMultipleFiles) break;
            }

            if (this.editorEnabled && this.selectedFiles.length === 1 && this.selectedFiles[0].isEditable() && !this.allowMultipleFiles) {
                const reader  = new FileReader();
                reader.onload = (e) => { this.cropperDataUrl = e.target.result; };
                reader.readAsDataURL(this.selectedFiles[0].data);
            }
        },
        loadFile(file) {
            const typeMap = {
                'image/gif': 'image', 'image/png': 'image', 'image/jpeg': 'image',
                'application/pdf': 'pdf',
                'video/mp4': 'video', 'video/mpeg': 'video',
                'audio/mpeg': 'audio',
                'application/x-zip-compressed': 'archive',
                'text/plain': 'text',
            };
            this.selectedFiles.push({
                data:          file,
                formattedSize: this.formatByteSize(file.size, 1),
                category:      typeMap[file.type] ?? 'misc',
                isEditable:    () => ['image/png', 'image/jpeg'].includes(file.type),
            });
        },
        sendData() {
            const data = new FormData();
            if (this.cropperData) {
                data.append(this.postParameterName, this.cropperData);
            } else if (this.allowMultipleFiles) {
                for (const f of this.selectedFiles) data.append(this.postParameterName + '[]', f.data);
            } else {
                data.append(this.postParameterName, this.selectedFiles[0].data);
            }

            axios.post(this.postUrl, data, {
                onUploadProgress: e => { this.uploadProgress = (e.loaded * 100.0 / e.total) || 100; },
            })
            .catch(() => {
                this.modalData = {
                    title:  this.uploadFailureTitle,
                    text:   this.uploadFailureText,
                    button: this.okButtonLabel,
                };
            })
            .then(response => {
                this.cropperData    = null;
                this.uploadProgress = 0;
                this.selectedFiles  = [];
                this.$emit('uploaded', response.data.results);
            });
        },
    },
});
