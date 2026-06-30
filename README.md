# mediagone/vue-in-twig-bundle

[![Latest Stable Version](https://img.shields.io/packagist/v/mediagone/vue-in-twig-bundle)](https://packagist.org/packages/mediagone/vue-in-twig-bundle)
[![Total Downloads](https://img.shields.io/packagist/dt/mediagone/vue-in-twig-bundle)](https://packagist.org/packages/mediagone/vue-in-twig-bundle)

**Integrates _Vue.js 3_ into Twig/Symfony** templates and **extends Vue's capabilities with _Twig_'s server-side power**: _slots, extends, embed_...

Compose your components, inject PHP constants or initial data directly into them and generate safe Symfony URLs with dynamic parameters.

**No _Node.js/npm ecosystem_ required**: no bundler, no build step, no node_modules...

## Table of contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Introduction](#introduction)
  - Credo: PHP as the single source of truth
  - What Twig brings that Vue alone cannot do
- [Get started](#get-started)
  - Create a Vue application
  - Declare and include components
  - Override the default configuration
- [Differences from standard Vue.js](#differences-from-standard-vuejs)
  - Delimiters
  - Injecting server-side data into Vue props
  - Injecting PHP constants into Vue expressions
  - Generate safe URLs for Symfony's routes
  - File naming convention
  - Twig composition over Vue slots
- [Examples](#examples)
- [Local development](#local-development)

---

## Installation
This package requires **PHP 8.1+**, **Twig 3** and **"symfony/framework-bundle" ^6.1|^7.0**

1. Add it as Composer dependency:
```bash
composer require mediagone/vue-in-twig-bundle
```
2. Register the bundle in `config/bundles.php`:
```php
Mediagone\VueInTwigBundle\VueInTwigBundle::class => ['all' => true],
```

3. Load **_Vue 3_ full build (with compiler)** in your layout. \
_Note: the compiler build is required since there is no precompile step, the x-templates are compiled in the browser at runtime._

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
```

4. A few components also call API endpoints via [axios](https://axios-http.com) — load it once if you use any of these: `ToggleButton`, `UploadZone`, `DataList`, `DataEditor`

```html
<script src="https://unpkg.com/axios/dist/axios.min.js"></script>
```


## ~~Configuration~~
~~The Twig namespace `@VueInTwig/` is configured automatically (`VueInTwigBundle::prepend()`) — no `twig.yaml` changes needed.~~



---

## Introduction

This bundle formalizes a specific integration pattern: **Vue components are written as `x-templates`, rendered and composed server-side by Twig.**


### _PHP as the single source of truth_

Beyond simplifying the front-end toolchain, the core benefit of rendering Vue server-side with Twig is that **PHP stays the single source of truth, automatically kept in sync with the front-end.**

Server-side values — _enum cases, constants, config, URLs_ — flow into the Vue UI at render time, so there is no hand-maintained JS duplicate that silently drifts out of sync when the PHP changes.

A concrete example: a `<select>` populated by iterating a PHP enum's cases in Twig.

```twig
<select v-model="type">
    {% for case in App\Domain\BlockType::cases() %}
        <option value="{{ case.value }}">{{ case.label }}</option>
    {% endfor %}
</select>
```

Add, rename or remove a case in `BlockType`, and the dropdown updates on the next render — _no parallel JS array to keep in sync_. \
The same idea applies to `v-if` checks against a status, a list of allowed types, a feature flag, etc. (see [Injecting PHP constants into Vue expressions](#differences-from-standard-vuejs) below).

### What Twig brings that Vue alone cannot do:

- Compose components server-side (Twig blocks/embeds — see [Twig composition over Vue slots](#differences-from-standard-vuejs))
- Inject PHP constants without an API call: `v-if="type === '{{ constant('Domain\\Block::TYPE_A') }}'"`
- Inject initial data without an API call: `:account="{{ account|vue_json_encode }}"`
- Generate type-safe Symfony URLs with dynamic Vue expressions, via `vue_path()`


---

## Get started

Everything is wired from your layout via Twig tags and functions — there is no `.js` entry file to write by hand.

Use `{% vue_app %}` to create and mount automatically your Vue application:

```twig
{% vue_app '#App' %}
  {% block CONTENT %}{% endblock %}
{% endvue_app %}
```

Declare required components to be queued for inclusion with the `{% vue_use %}` tag:

```twig
{% vue_app '#App' %}
  {% vue_use 'Controls/DatePicker' %}
  
  {% vue_use 'Layout/Modal' %}
  {% vue_use 'Layout/Modal' %}  {# ignored, if a component is declared twice, it'll only included once #}
  
  {% block CONTENT %}{% endblock %}
{% endvue_app %}
```

Every `{% vue_use %}` tag must be used within the `{% vue_app %}` tags — whether placed in the same template or in any included or extended template:

---
#### Example:

_Layout.twig:_
```twig
{% vue_app '#App' %}
  {% vue_use 'Controls/DatePicker' %}
  {% vue_use 'Layout/Modal' %}
  ...
  {% block CONTENT %}{% endblock %}
{% endvue_app %}
```

_Page.twig:_
```twig
{% extends 'Layout.twig' %}

{% vue_use 'Controls/DatePicker' %} {# already included, ignored #}
{% vue_use 'Controls/SwitchButton' %}

{% block CONTENT %}
  <section>
    {% include 'Partial.twig' %}
  </section>
{% endblock %}
```


_Partial.twig:_
```twig
{% vue_use 'Controls/ToggleButton' %}

...
```


Placed in your base layout, `vue_app` will output:
1. **Opening tag** → `<script>window.VUE_APP = Vue.createApp(window.VUE_ROOT ?? {});</script>` + `setup.js` (delimiters, global mixin)
2. **Body** → rendered normally; `{% vue_use %}` tags queue components silently (no output)
3. **Closing tag** → all queued component templates + scripts (deduplicated, in call order) + `<script>VUE_APP.mount('selector');</script>`





---

## Differences from standard Vue.js

### Delimiters

Vue's default `{{ }}` delimiters conflict with Twig, so Vue-in-twig reconfigures them to `[[ ]]`. \
Use `[[ ]]` everywhere Vue reactivity is needed — in x-templates (`.vue.twig`) and in the mounted HTML.

```twig
{# Vue reactive expression — evaluated in the browser #}
<p>[[ item.title ]]</p>
<p v-if="count > 0">[[ count ]] items</p>
```

The two template engines coexist in the same markup, each running at a different time:

| | Engine | Runs | Syntax |
|---|---|---|---|
| Server | Twig | At request time (PHP) | `{{ }}` |
| Client | Vue | In the browser (JS) | `[[ ]]` |



### Twig composition over Vue slots

Components in this bundle are extended/composed with **Twig** (`{% embed %}` + blocks — server-side composition) rather than Vue's slots, because they are too limited for and offer less customization. This is why a complex component like `DataList` exposes Twig blocks instead of Vue slots for its markup — see the [DataList example](#datalist-vue-datalist).

Simple, purely visual customization points (a button label, a small fragment of markup) still use regular Vue slots — e.g. `Modal`'s header/footer, `DropZone`'s instructions/infos...

```twig

```



### Injecting server-side data into Vue props

Twig `{{ }}` still works inside HTML attributes — Twig renders the attribute value as a string, and Vue reads it as a JS expression:

```twig
{# Static PHP value, no reactivity needed #}
:locale="'{{ app.request.locale }}'"
:max-size="{{ maxFileSizeBytes }}"
```

Both lines above write the value raw, with no JSON encoding — safe here given the nature of these values: `app.request.locale` and `maxFileSizeBytes` can't contain characters that would break the expression. For anything else (user input, free text, structured data...) this library provides the `|vue_json_encode` filter, which is an HTML-safe replacement for `|json_encode` that serializes and escapes the value safely:

```twig
{# Before — XSS risk #}
:account="{{ account|json_encode }}"

{# After — Prevents XSS when injecting PHP data as Vue props #}
:account="{{ account|vue_json_encode }}"
```

_Note: `vue_json_encode` applies `JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_THROW_ON_ERROR`._


### Injecting PHP constants into Vue expressions

Constants and enums can be injected directly into Vue attribute values — _Twig_ renders them as literal strings before Vue compiles the template.

```twig
v-if="block.type === '{{ constant('App\\Domain\\Block::TYPE_VIDEO') }}'"
:allowed-types="['{{ constant('App\\Domain\\Media::TYPE_IMAGE') }}', '{{ constant('App\\Domain\\Media::TYPE_PDF') }}']"
```



### Generate safe URLs for Symfony's routes

Symfony URLs combining static and dynamic, Vue-side parameters can be safely generated via the `vue_path(route, staticParams, dynamicParams)` function (similar to Symfony's `path()`):

```twig
:url="{{ vue_path('ajax_account', {}, {accountId: 'account.id'}) }}"
```

Generates: `'/ajax/account?accountId=__ACCOUNTID__'.replace('__ACCOUNTID__', account.id)`



### File naming convention

`.vue.twig` + `.vue.js` — immediately identifies Vue files among other Twig templates.




```twig
{% vue_app '#App' %}
    {% block BODY_CONTENT %}{% endblock %}
{% endvue_app %}
```

Placed in your base layout, it'll output:

1. **Opening tag** → `<script>window.VUE_APP = Vue.createApp(window.VUE_ROOT ?? {});</script>` + `setup.js` (delimiters, global mixin)
2. **Body** → rendered normally; `{% vue_use %}` tags queue components silently (zero output)
3. **Closing tag** → all queued component templates + scripts (deduplicated, in call order) + `<script>VUE_APP.mount('selector');</script>`

#### `VUE_ROOT` — root component options

`Vue.createApp()` is called with `window.VUE_ROOT ?? {}`. Declare root-level `data()`/`methods`/etc. globally **before** `{% vue_app %}` runs:

```twig
<script>
window.VUE_ROOT = {
    data() {
        return { showModal: false };
    },
};
</script>

{% vue_app '#App' %}
    ...
{% endvue_app %}
```

#### Tip — mount placement

Vue replaces the mount target's content (`container.innerHTML = ''`) before mounting. Since `{% endvue_app %}` outputs the queued x-templates and component scripts, place `{% vue_app %}...{% endvue_app %}` **after** the element you mount onto (e.g. after `</div>` closing `#App`), not inside it — otherwise the x-templates get wiped out before Vue can read them.

### Declare and include components (2)

Vue components are declared and queued for inclusion via the `{% vue_use %}` tag:

```twig
{% vue_use 'Controls/DatePicker' %}

{# Called twice → included once #}
{% vue_use 'Layout/Modal' %}
{% vue_use 'Layout/Modal' %}  {# ignored #}
```

Can be called from any partial, before `{% endvue_app %}`. Duplicate calls are ignored (include-once); the queue otherwise preserves call order. Each call queues two files (if they exist):
- `Category/ComponentName.vue.twig` — the x-template
- `Category/ComponentName.vue.js` — the component registration

By default, a bare `'Category/Name'` resolves against the bundle's own `@VueInTwig` namespace — this is what you use for every built-in component shown in [Examples](#examples).

#### Registering your own components

_By default, a bare `'Category/Name'` resolves against the bundle's own `@VueInTwig` namespace — this is what you use for every built-in component shown in examples._

`{% vue_use %}` also accepts an explicit `@Namespace/...` reference, used as-is instead of being prefixed. This lets a consuming app register its own Vue components through the same queue/dedup mechanism — typically to extend a bundle component (see the [DataList example](#datalist-vue-datalist)).

```yaml
# config/packages/vue_in_twig.yaml
vue_in_twig:
    default_namespace: '@App'   # default: '@VueInTwig'
```

```yaml
# config/packages/twig.yaml
twig:
    paths:
        '%kernel.project_dir%/templates/vue': 'App'
```

```twig
{% vue_use '@VueInTwig/Widgets/DataList' %}  {# bundle component → explicit namespace #}
{% vue_use 'Portal/UsersList' %}              {# app component → resolved via default_namespace #}
```

Without this config, the default namespace stays `@VueInTwig`, so every bare `{% vue_use 'Category/Name' %}` keeps resolving to the bundle's own components — no change for the common case.

**Order matters.** The queue is flushed in call order, immediately before `VUE_APP.mount()`. A component that `extends` another (e.g. `VUE_APP.component('vue-datalist')`) must be `{% vue_use %}`'d **after** its base — otherwise the base isn't registered yet when the extending component reads it.

### Override the default configuration

The default configuration can be overridden via the `vue_config` function or tag, which populates `window.VUE_CONFIG` — read by `setup.js` and by components such as `DataList`. Two complementary forms:

```twig
{# Function — value must be JSON-serializable PHP #}
{{ vue_config('search.debounceMs', 500) }}

{# Tag — body is raw JS, for an already-JSON source or non-serializable values like functions #}
{% vue_config 'chart.options' %}
{ responsive: true, onClick: () => { /* ... */ } }
{% endvue_config %}
```

The dot-path maps to `VUE_CONFIG.root.key` (`'search.debounceMs'` → `VUE_CONFIG.search = { debounceMs: 500 };`). Both forms write the same way and can target the same root key from different places; the buffered config is flushed once as a single `<script>` block at `{% endvue_app %}`, replacing the old pattern of an inline `<script>VUE_CONFIG.x = ...;</script>` override placed by hand in the body.

### setup.js mixins and helpers

`setup.js` is rendered automatically by the opening `{% vue_app %}` tag. It provides:

| | |
|---|---|
| `VUE_APP.config.compilerOptions.delimiters` | Set to `['[[', ']]']` |
| `format_date(value, locale, options)` | Global mixin method — `Intl.DateTimeFormat` wrapper |
| `month_name(month)` | Global mixin method — localized month name for a 1-12 month number |
| `slugify(str)` | Global mixin method — ASCII slug |
| `window.debounce(fn, ms)` | Helper used internally by `DataList`; overridable via `??=` |
| `window.VUE_CONFIG` | Defaults to `{ debounceSearch: 300 }`, overridable via `vue_config` |

---

## Examples

Each example assumes the component was declared with `{% vue_use %}` and Vue 3 (+ axios where noted) is loaded, as described in [Get started](#get-started). Props tables list every prop declared on the component; "Required" props have no default.

### Controls

#### DatePicker (`vue-date-picker`)

Date selection input (year / month / day selects).

```twig
{% vue_use 'Controls/DatePicker' %}

<vue-date-picker :initial-date="new Date()" :years-before="2" :years-after="3" @date-selected="onDate"></vue-date-picker>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `initialDate` | `Date` | — | ✓ |
| `yearsBefore` | `Number` | `2` | |
| `yearsAfter` | `Number` | `3` | |
| `yearsList` | `Array` | `null` (computed from `yearsBefore`/`yearsAfter`) | |

**Emits:** `dateSelected` (the new `Date`)

#### DatetimePicker (`vue-datetime-picker`)

Date + time selection input.

```twig
{% vue_use 'Controls/DatetimePicker' %}

<vue-datetime-picker :initial-date="new Date()" :use-time="true" @date-selected="onDate"></vue-datetime-picker>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `initialDate` | `Date` | — | ✓ |
| `useTime` | `Boolean` | `true` | |
| `showAllMinutes` | `Boolean` | `false` (otherwise rounded to 5-minute steps) | |
| `yearsBefore` | `Number` | `2` | |
| `yearsAfter` | `Number` | `3` | |
| `yearsList` | `Array` | `null` | |
| `futureDateText` | `String` | `''` | |
| `pastDateText` | `String` | `''` | |

**Emits:** `dateSelected` (the new `Date`)

#### DropZone (`vue-drop-zone`)

File selection + validation + a confirmation preview modal. Does **not** upload — it only emits the selected files; the parent handles the actual upload (see `UploadZone` for an integrated alternative).

```twig
{% vue_use 'Controls/DropZone' %}

<vue-drop-zone title="Drop a file here" file-mime-types="image/jpeg,image/png" :file-max-size="5242880" @select="onFiles"></vue-drop-zone>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `title` | `String` | — | ✓ |
| `selectionLimit` | `Number` | `0` (unlimited) | |
| `fileMaxSize` | `Number` | `0` (unlimited), in bytes | |
| `fileMimeTypes` | `String` | `''` (any), comma-separated | |

**Emits:** `select` (array of valid `File` objects, once confirmed in the preview modal)

**Slots**

| Slot | Scope | Description |
|---|---|---|
| `instructions` | `fileInput` | Replaces the default "drag & drop or browse" text |
| `infos` | `formats`, `maxSize` | Replaces the default formats/size hint |

#### UploadZone (`vue-upload-zone`)

File selection with an **integrated upload** (axios) and an optional built-in crop step (embeds `ImageCropper`) before sending.

```twig
{% vue_use 'Controls/UploadZone' %}

<vue-upload-zone
    post-url="/upload"
    post-parameter-name="file"
    title="Upload a file"
    drop-text="Drop here or click"
    :allow-multiple-files="false"
    @uploaded="onUploaded"
></vue-upload-zone>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `postUrl` | `String` | — | ✓ |
| `postParameterName` | `String` | — | ✓ |
| `title` | `String` | — | ✓ |
| `dropText` | `String` | — | ✓ |
| `allowedFileTypes` | `String` | `''`, comma-separated | |
| `allowMultipleFiles` | `Boolean` | `false` | |
| `maxFileSize` | `Number` | `0` (unlimited), in bytes | |
| `dropInfoText` | `String` | `'({formats} <= {maxSize})'` — placeholders: `{formats}`, `{outputWidth}`, `{outputHeight}`, `{maxSize}` | |
| `editorEnabled` | `Boolean` | `false` — crop step for a single image (png/jpeg) before upload | |
| `editorOutputWidth` / `editorOutputHeight` | `Number` | `0` (natural crop size) | |
| `editorOutputFormat` | `String` | `''` (same as source) | |
| `editorFixedRatio` | `Boolean` | `false` | |
| `sendButtonLabel` / `cancelButtonLabel` / `okButtonLabel` | `String` | `'Envoyer'` / `'Annuler'` / `'OK'` | |
| `fileTooLargeTitle` / `fileTooLargeText` | `String` | text supports `{filename}`, `{size}`, `{maxsize}` | |
| `uploadFailureTitle` / `uploadFailureText` | `String` | shown if the axios `POST` fails | |

**Emits:** `uploaded` (the server response's `results`)

#### ImageCropper (`vue-image-cropper`)

Interactive crop UI (8 resize handles + move) over a source image, rendering the crop to a `<canvas>`.

```twig
{% vue_use 'Controls/ImageCropper' %}

<vue-image-cropper :source-data-url="imageDataUrl" output-mime-format="image/jpeg" @cropped="onCropped"></vue-image-cropper>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `sourceDataUrl` | `String` | — | ✓ |
| `outputWidth` / `outputHeight` | `Number` | `0` (natural crop size) | |
| `outputMimeFormat` | `String` | `''` (same as source) | |
| `fixedRatio` | `Boolean` | `false` (hold Shift while dragging to force it ad hoc) | |

**Emits:** `cropped` (a `Blob`, from `canvas.toBlob()`)

#### SwitchButton (`vue-switch-button`)

Toggle switch that is **parent-controlled**: it never mutates the bound object itself, it only asks for the change.

```twig
{% vue_use 'Controls/SwitchButton' %}

<vue-switch-button :object="item" property="status" value-on="on" value-off="off" @switch-request="item.status = $event"></vue-switch-button>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `object` | `Object` | — | ✓ |
| `property` | `String` | — | ✓ |
| `valueOn` | `String\|Boolean\|Number` | — | ✓ |
| `valueOff` | `String\|Boolean\|Number` | — | ✓ |
| `disabled` | `Boolean` | `false` | |

**Emits:** `switch-request` (the would-be next value — the parent decides whether/how to apply it, e.g. after an API call)

#### ToggleButton (`vue-togglebutton`)

Two-state button that is **API-driven**, unlike `SwitchButton`: it fetches its own current value on creation and posts the change itself.

```twig
{% vue_use 'Controls/ToggleButton' %}

<vue-togglebutton :api_url="{{ vue_path('toggle_item', {}, {id: 'item.id'}) }}" result_name="toggle_item" result_property="active"></vue-togglebutton>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `api_url` | `String` | — | ✓ |
| `result_name` | `String` | — | ✓ |
| `result_property` | `String` | — | ✓ |
| `value_on` / `value_off` | `String` | `'1'` / `'0'` | |
| `confirm_on` / `confirm_off` | `String` | `''` (no confirmation) | |
| `disabled` | `Boolean` | `false` | |

On creation, performs `GET {api_url}?fields={result_property}` and reads `response.data.results[result_name][result_property]`. On click, `POST`s the new value the same way and updates from the response. No emits — state lives in the component.

### Layout

#### Modal (`vue-modal`)

```twig
{% vue_use 'Layout/Modal' %}

<vue-modal v-if="showModal" title-text="Title" yes-button-text="Confirm" no-button-text="Cancel" @clickyes="showModal = false" @clickno="showModal = false">
    <p>Modal content.</p>
</vue-modal>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `titleText` | `String` | `''` | |
| `titleStyle` | `String` | `''` (e.g. `'warning'`, `'danger'`) | |
| `yesButtonText` / `noButtonText` | `String` | `''` (hidden if empty) | |
| `yesButtonClass` / `noButtonClass` | `String` | `'--primary'` / `''` | |
| `yesButtonEnabled` / `noButtonEnabled` | `Boolean` | `true` | |

**Emits:** `clickyes`, `clickno` (from the default footer buttons)

**Slots**

| Slot | Description |
|---|---|
| `header` | Replaces the default title block |
| *(default)* | Modal body |
| `footer` | Replaces the default yes/no buttons (you then own the emits) |

#### LockWrapper (`vue-lock-wrapper`)

Locks/unlocks its content (e.g. a disabled form until the user explicitly unlocks it).

```twig
{% vue_use 'Layout/LockWrapper' %}

<vue-lock-wrapper>
    <template #content="{ locked }">
        <input :disabled="locked" value="..." />
    </template>
    <template #button="{ locked }">
        [[ locked ? 'Unlock' : 'Lock' ]]
    </template>
</vue-lock-wrapper>
```

No props. Internal state: `locked` (defaults to `true`).

**Slots**

| Slot | Scope | Description |
|---|---|---|
| `content` | `locked`, `lock`, `unlock`, `toggle` | The protected content |
| `button` | `locked` | Label/icon of the lock toggle button (the `<button>` itself, already wired to `toggle()`, wraps this slot) |

### Behaviors

Renderless components (no wrapper element) — they apply behavior directly to their single child.

#### AutoResize (`vue-auto-resize`)

```twig
{% vue_use 'Behaviors/AutoResize' %}

<vue-auto-resize>
    <textarea style="resize:none"></textarea>
</vue-auto-resize>
```

Resizes its child (e.g. a `<textarea>`) to fit its content, on input and on window resize. No props, no emits — wraps exactly one child element.

#### Draggable (`vue-draggable`)

Native HTML5 drag & drop, zero dependency. Reorders a list's children and moves items between lists sharing the same `group`.

```twig
{% vue_use 'Behaviors/Draggable' %}

<vue-draggable v-model="items" group="things" @change="onChange">
    <div>
        <div v-for="it in items" :key="it.id">[[ it.label ]]</div>
    </div>
</vue-draggable>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `modelValue` | `Array` | — | ✓ (use with `v-model`) |
| `group` | `String` | `null` — two lists with the same non-null group accept moves between them | |
| `sort` | `Boolean` | `true` — reorder *within* this list | |
| `emptyHeight` | `String` | `null` — inline min-height forced while empty, so it stays droppable without CSS | |
| `usePlaceholder` | `Boolean` | `false` — gap placeholder instead of the default thin insertion line | |

**Emits:** `update:modelValue` (new array), `change` (no payload) — the component mutates nothing in place, it re-emits new arrays.

Drop feedback is themable via CSS variables (on the list element or `:root`): `--vue-draggable-indicator-color` (`#2684ff`), `--vue-draggable-indicator-size` (`2px`), `--vue-draggable-indicator-style` (`solid`, line mode only), `--vue-draggable-placeholder-bg`.

### Widgets

#### DataEditor (`vue-data-editor`)

Formalizes an inline-edit pattern: tracks whether `item` changed since it was loaded/saved, and shows a save bar only when there's something to save.

```twig
{% vue_use 'Widgets/DataEditor' %}

<vue-data-editor :item="item" post-url="/api/save" post-url-properties="name,email">
    <template #default="{ item, changed }">
        <input v-model="item.name" @input="changed()" />
        <input v-model="item.email" @input="changed()" />
    </template>
</vue-data-editor>
```

**Props**

| Prop | Type | Default | Required |
|---|---|---|---|
| `item` | `Object` | — | ✓ |
| `postUrl` | `String\|Function` | — | ✓ — a function receives `item` and must return the URL, for dynamic endpoints |
| `postUrlProperties` | `String` | — | ✓ — comma-separated list of `item` keys to send |
| `resultPath` | `String` | `null` | dot-path into the response (e.g. `'results.portal'`) to sync `item` back from the server; omit to stay shape-agnostic |
| `upToDateText` | `String` | `''` | shown when there's nothing to save; empty keeps that panel hidden |

No emits. Calling `changed()` (exposed in the default slot) re-checks whether `item` differs from its last-saved snapshot and shows/hides the save bar accordingly; `save()` posts the listed properties and re-snapshots on success.

**Slots**

| Slot | Scope | Description |
|---|---|---|
| `save-text` | — | Replaces the default "you have unsaved changes" text |
| *(default)* | `item`, `originalItem`, `data` (`$data`), `props` (`$props`), `changed` | The editable form |
| `modal-error` | `data` (`$data`), `props` (`$props`) | Replaces the default error message in the failure modal |

#### DataList (`vue-datalist`)

Formalizes a list pattern: fetch + pagination + create/delete, with debounced refresh for search/filter inputs. `vue-datalist` itself is **logic only — it has no template and no slots**. The markup comes from embedding `Widgets/DataList.twig` and overriding its Twig blocks; your own component then **extends** the base logic.

**1. Base component** — queue it like any other:

```twig
{% vue_use 'Widgets/DataList' %}
```

**2. Your extending component** — registered in your own app, under your configured [namespace](#configuration) so it loads through the same queue, *after* the base:

```twig
{% vue_use 'Portal/UsersList' %}
```

```js
// templates/vue/Portal/UsersList.vue.js (or wherever your '@App' namespace points)
VUE_APP.component('vue-users-list', {
    extends: VUE_APP.component('vue-datalist'),
    data() {
        return { search: '' };
    },
    methods: {
        modifyUrlParameters(params) {
            if (this.search) params.push('search=' + encodeURIComponent(this.search));
        },
    },
});
```

**3. The markup** — embed the bundle's template, overriding only the blocks you need:

```twig
{% embed '@VueInTwig/Widgets/DataList.twig' with { ComponentName: 'vue-users-list' } %}
    {% block TOOLS_LEFT %}
        <input type="search" v-model="search" @input="debounceRefresh()" placeholder="Search…">
    {% endblock %}

    {% block TABLE_HEADERS %}
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
    {% endblock %}

    {% block TABLE_ROW %}
        <td>[[ row.id ]]</td>
        <td>[[ row.name ]]</td>
        <td>[[ row.email ]]</td>
    {% endblock %}
{% endembed %}
```

**Props** (on the base `vue-datalist`, inherited by your component)

| Prop | Type | Default | Required |
|---|---|---|---|
| `itemsListUrl` | `String` | — | ✓ |
| `itemsCreateUrl` | `String` | `''` (create disabled) | |
| `itemsDeleteUrl` | `String` | `''` (delete disabled), use a `-ID-` placeholder | |
| `page` | `Number` | `1` | |
| `config` | `Object` | `{}` | per-instance override, see below |

**Twig blocks** (`Widgets/DataList.twig`)

| Block | Default | Notes |
|---|---|---|
| `TOOLS_LEFT` / `TOOLS_RIGHT` | empty / refresh button | Toolbar content |
| `TABLE_HEADERS` | empty | `<th>` cells, inside the header `<tr>` |
| `TABLE_ROW` | empty | `<td>` cells for each `row` in `items` |
| `TABLE_BUSY` | loading text | Shown while `isBusy` |
| `TABLE_EMPTY` | "no results" text | Shown when `items` is empty |
| `BODY` | empty | Extra markup after the table (e.g. a "create" button) |
| `MODAL_CREATE` / `MODAL_DELETE` | empty | Body of the create/delete confirmation modals |
| `MODAL_ERROR` | error description | Body of the error modal |

**Overridable hooks** (override in your extending component's `methods`)

| Hook | Purpose |
|---|---|
| `parseResponse(response)` | Maps a successful list response to `{ items, page, pageCount, total }`. Default reads `response.data.payload`; falls back to `VUE_CONFIG.DataList.parseResponse` if set |
| `parseErrorResponse(response)` | Extracts `{ code, description }` from a failed response. Falls back to `VUE_CONFIG.DataList.parseErrorResponse` |
| `buildErrorModal(error, context)` | Builds the error modal object (title/description) from the extracted error; `context` is `'list'`/`'create'`/`'delete'` |
| `rowKey(row)` | `:key` for each row — defaults to `row.id ?? row` |
| `rowAttributes(row)` | Extra attributes/listeners (e.g. `onClick`, `class`) merged onto each `<tr>` |
| `modifyUrlParameters(params)` | Push extra query params (e.g. search/filters) before each list request |
| `onItemsRefresh()` / `onItemsRefreshFailure()` | Called after a successful/failed refresh |

Call `this.debounceRefresh()` (instead of `this.itemsRefresh()`) from a search/filter input handler to debounce the request using `VUE_CONFIG.debounceSearch`.

**`config` shape** — `{ parseResponse, parseErrorResponse, icons, texts, tooltips }`, merged over `VUE_CONFIG.DataList` (global default for every list, set via [`vue_config`](#configuration)); `icons`/`texts`/`tooltips` merge per-key, so a partial override keeps the other defaults.
