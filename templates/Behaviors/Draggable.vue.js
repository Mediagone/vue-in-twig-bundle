// Renderless drag & drop behavior — zero dependency, native HTML5 Drag and Drop.
//
// Makes the direct children of its single child element re-orderable, and movable between
// other <vue-draggable> lists that share the same `group`. It mirrors the subset of the
// vuedraggable API used in practice:
//   - v-model         : the bound array (items match the direct child elements, in order) ;
//   - group           : a string ; two lists with the same non-null group accept moves between them ;
//   - sort            : whether items can be re-ordered *within* this list (default true) ;
//   - empty-height    : optional inline min-height forced while the list is empty, so it stays
//                       droppable without any CSS ; default null = rely on your own CSS ;
//   - use-placeholder : drop feedback as a gap placeholder sized to the dragged row, instead of
//                       the default thin insertion line ;
//   - @change         : emitted whenever this list's array changes (no payload).
//
// Drop feedback is themable via CSS variables (on the list element or globally on :root):
//   --vue-draggable-indicator-color (default #2684ff), --vue-draggable-indicator-size (2px),
//   --vue-draggable-indicator-style (solid, line mode), --vue-draggable-placeholder-bg.
// The component mutates nothing in place — it re-emits new arrays.
//
// Usage (delimiters are Twig here, Vue [[ ]] inside the child):
//   <vue-draggable v-model="items" group="things" @change="onChange">
//       <div><div v-for="it in items" :key="it.id">[[ it.label ]]</div></div>
//   </vue-draggable>
(function () {
    // Shared across every <vue-draggable> instance so a drop target can reach its source list,
    // and so a leftover insertion line can always be cleared on dragend.
    let activeDrag = null;     // { group, source (component), fromIndex, item }
    let indicatorHost = null;  // the component currently showing the insertion line

    VUE_APP.component('vue-draggable', {
        props: {
            modelValue: {
                type: Array,
                required: true,
            },
            group: {
                type: String,
                default: null,
            },
            sort: {
                type: Boolean,
                default: true,
            },
            emptyHeight: {
                type: String,
                default: null,
            },
            // Drop feedback style: false = thin insertion line, true = a gap placeholder
            // (Sortable-like) sized to the dragged row.
            usePlaceholder: {
                type: Boolean,
                default: false,
            },
        },
        emits: ['update:modelValue', 'change'],
        render() {
            return this.$slots.default ? this.$slots.default()[0] : null;
        },
        mounted() {
            this.indicator = null;
            this.$el.addEventListener('dragstart', this.onDragStart);
            this.$el.addEventListener('dragover', this.onDragOver);
            this.$el.addEventListener('dragleave', this.onDragLeave);
            this.$el.addEventListener('drop', this.onDrop);
            this.$el.addEventListener('dragend', this.onDragEnd);
            this.refreshState();
        },
        updated() {
            this.refreshState();
        },
        beforeUnmount() {
            this.$el.removeEventListener('dragstart', this.onDragStart);
            this.$el.removeEventListener('dragover', this.onDragOver);
            this.$el.removeEventListener('dragleave', this.onDragLeave);
            this.$el.removeEventListener('drop', this.onDrop);
            this.$el.removeEventListener('dragend', this.onDragEnd);
        },
        methods: {
            // Direct children that are actual rows (i.e. excluding the insertion line).
            rows() {
                return Array.prototype.filter.call(this.$el.children, (c) => c !== this.indicator);
            },
            // Flag rows as draggable + keep an empty list droppable via a min-height.
            refreshState() {
                if (!this.$el || !this.$el.children) return;

                const rows = this.rows();
                for (const row of rows) {
                    row.setAttribute('draggable', 'true');
                }

                if (this.emptyHeight !== null) {
                    this.$el.style.minHeight = rows.length === 0 ? this.emptyHeight : '';
                }
            },
            // Index, among the rows, of the row containing the given node.
            rowIndex(node) {
                while (node && node.parentNode !== this.$el) {
                    node = node.parentNode;
                }
                if (!node || node === this.indicator) return -1;
                return this.rows().indexOf(node);
            },
            // Whether the currently active drag can be dropped into this list.
            isCompatible() {
                if (activeDrag === null) return false;
                if (activeDrag.source === this) return this.sort; // internal reorder
                return this.group !== null && this.group === activeDrag.group; // cross-list move
            },
            // Insertion index based on the pointer position relative to the rows.
            dropIndex(event) {
                const rows = this.rows();
                for (let i = 0; i < rows.length; i++) {
                    const rect = rows[i].getBoundingClientRect();
                    if (event.clientY < rect.top + (rect.height / 2)) {
                        return i;
                    }
                }
                return rows.length;
            },
            // Inline style of the drop indicator. Everything visual is exposed as a CSS variable
            // (with sensible defaults) so it can be themed from the consuming stylesheet.
            indicatorStyle() {
                if (this.usePlaceholder) {
                    const height = (activeDrag && activeDrag.height) ? activeDrag.height + 'px' : '2em';
                    return 'pointer-events:none;box-sizing:border-box;margin:4px 0;border-radius:4px;'
                        + 'height:' + height + ';'
                        + 'border:var(--vue-draggable-indicator-size, 2px) dashed var(--vue-draggable-indicator-color, #2684ff);'
                        + 'background:var(--vue-draggable-placeholder-bg, rgba(38, 132, 255, 0.08));';
                }
                return 'pointer-events:none;height:0;margin:-1px 0;'
                    + 'border-top:var(--vue-draggable-indicator-size, 2px) var(--vue-draggable-indicator-style, solid) var(--vue-draggable-indicator-color, #2684ff);';
            },
            showIndicator(index) {
                if (!this.indicator) {
                    this.indicator = document.createElement('div');
                    this.indicator.className = 'vue-draggable-indicator';
                }
                this.indicator.style.cssText = this.indicatorStyle();

                if (this.indicator.parentNode) {
                    this.indicator.parentNode.removeChild(this.indicator);
                }

                const rows = this.rows();
                if (index >= rows.length) {
                    this.$el.appendChild(this.indicator);
                } else {
                    this.$el.insertBefore(this.indicator, rows[index]);
                }
                indicatorHost = this;
            },
            clearIndicator() {
                if (this.indicator && this.indicator.parentNode) {
                    this.indicator.parentNode.removeChild(this.indicator);
                }
                if (indicatorHost === this) {
                    indicatorHost = null;
                }
            },
            onDragStart(event) {
                const index = this.rowIndex(event.target);
                if (index < 0) return;

                const row = this.rows()[index];

                activeDrag = {
                    group: this.group,
                    source: this,
                    fromIndex: index,
                    item: this.modelValue[index],
                    height: row ? row.offsetHeight : 0,
                };

                event.dataTransfer.effectAllowed = 'move';
                // Firefox won't start a drag unless some data is set.
                try { event.dataTransfer.setData('text/plain', ''); } catch (e) { /* IE guard */ }
            },
            onDragOver(event) {
                if (!this.isCompatible()) return;
                event.preventDefault(); // required to allow a drop
                event.dataTransfer.dropEffect = 'move';
                this.showIndicator(this.dropIndex(event));
            },
            onDragLeave(event) {
                // Only clear when the pointer actually leaves this list (not on inner boundaries).
                if (!this.$el.contains(event.relatedTarget)) {
                    this.clearIndicator();
                }
            },
            onDrop(event) {
                if (!this.isCompatible()) return;
                event.preventDefault();

                const drag = activeDrag;
                this.clearIndicator();
                let toIndex = this.dropIndex(event);

                if (drag.source === this) {
                    // Re-order within the same list.
                    if (!this.sort) return;

                    const next = this.modelValue.slice();
                    next.splice(drag.fromIndex, 1);
                    if (toIndex > drag.fromIndex) toIndex--;
                    next.splice(toIndex, 0, drag.item);

                    this.$emit('update:modelValue', next);
                    this.$emit('change');
                } else {
                    // Move the item out of the source list and into this one.
                    const fromList = drag.source.modelValue.slice();
                    fromList.splice(drag.fromIndex, 1);
                    drag.source.$emit('update:modelValue', fromList);
                    drag.source.$emit('change');

                    const toList = this.modelValue.slice();
                    toList.splice(toIndex, 0, drag.item);
                    this.$emit('update:modelValue', toList);
                    this.$emit('change');
                }
            },
            onDragEnd() {
                activeDrag = null;
                if (indicatorHost) {
                    indicatorHost.clearIndicator();
                }
            },
        },
    });
})();