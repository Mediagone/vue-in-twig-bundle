# mediagone/vue-in-twig-bundle

A standalone Vue.js 3 integration for Twig/Symfony — without a Node.js toolchain.

## The pattern

This bundle formalizes a specific integration approach: **Vue components written as x-templates, rendered and composed server-side by Twig**.

```
PHP (enums, config, IDs) → Twig props → Vue component (presentation)
                                               ↕
                                     XHR → internal API (business data)
```

What Twig brings that Vue alone cannot do:
- Inject PHP constants without an API: `v-if="type === '{{ constant('Domain\\Block::TYPE_A') }}'"`
- Type-safe Symfony URLs with dynamic Vue expressions via `vue_path()`
- Server-side component composition (Twig blocks/embeds)
- Initial data without an API call: `:account="{{ account|vue_props_encode }}"`

No bundler, no build step, no `node_modules`.

---

## Installation

```bash
composer require mediagone/vue-in-twig-bundle
```

Register the bundle in `config/bundles.php`:

```php
Mediagone\VueInTwigBundle\VueInTwigBundle::class => ['all' => true],
```

The Twig namespace `@VueInTwig/` is configured automatically.

Load **Vue 3 (full build, with compiler)** in your layout — the compiler is required since templates are compiled at runtime:

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
```

---

## Usage

### `{% vue_app 'selector' %}...{% endvue_app %}`

Wraps all Vue initialization. Place it in your base layout.

```twig
{% vue_app '#App' %}
    {% block BODY_CONTENT %}{% endblock %}
{% endvue_app %}
```

What it outputs:
1. **Opening tag** → `<script>window.VUE_APP = Vue.createApp({});</script>` + `setup.js` (delimiters, global mixin)
2. **Body** → rendered normally; `vue_use()` calls queue components silently (zero output)
3. **Closing tag** → all queued component templates + scripts (deduplicated, in call order) + `<script>VUE_APP.mount('selector');</script>`

---

### `{{ vue_use('Category/ComponentName') }}`

Declares a Vue component dependency. Can be called from any partial, in any order, before `{% endvue_app %}`. Duplicate calls are ignored (include-once).

```twig
{# In a partial — declares its Vue dependency #}
{{ vue_use('Controls/DatePicker') }}

{# Called twice → included once #}
{{ vue_use('Layout/Modal') }}
{{ vue_use('Layout/Modal') }}  {# ignored #}
```

Each call queues two files from the bundle's `templates/` directory:
- `Category/ComponentName.vue.twig` — the x-template (if it exists)
- `Category/ComponentName.vue.js` — the component registration (if it exists)

---

### `|vue_props_encode`

HTML-safe replacement for `|json_encode`. Prevents XSS when injecting PHP data as Vue props.

```twig
{# Before — XSS risk #}
:account="{{ account|json_encode }}"

{# After #}
:account="{{ account|vue_props_encode }}"
```

Applies `JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT`.

---

### `vue_path(route, staticParams, dynamicParams)`

Generates a Symfony `path()` with dynamic Vue expressions, via two separate parameter arrays — no reserved characters, no fragile string conventions.

```twig
{# Before — verbose and fragile #}
:url="'{{ path('ajax_account', {accountId: '__ID__', fields: 'full'}) }}'.replace('__ID__', account.id)"

{# After #}
:url="{{ vue_path('ajax_account', {fields: 'full'}, {accountId: 'account.id'}) }}"
```

Generates: `'/ajax/account?fields=full&accountId=__ACCOUNTID__'.replace('__ACCOUNTID__', account.id)`

---

## Twig/Vue writing conventions

Two template engines coexist in the same HTML, each running at a different time:

| | Engine | Runs | Syntax |
|---|---|---|---|
| Server | Twig | At request time (PHP) | `{{ }}` |
| Client | Vue | In the browser (JS) | `[[ ]]` |

### Delimiters: `[[ ]]` instead of `{{ }}`

Vue's default `{{ }}` delimiters conflict with Twig. `setup.js` reconfigures them to `[[ ]]`. Use `[[ ]]` everywhere Vue reactivity is needed — in x-templates (`.vue.twig`) and in the mounted HTML.

```twig
{# Vue reactive expression — evaluated in the browser #}
<p>[[ item.title ]]</p>
<p v-if="count > 0">[[ count ]] items</p>
```

### Injecting server-side data into Vue props

Twig `{{ }}` still works inside HTML attributes — Twig renders the attribute value as a string, Vue reads it as a JS expression. This is how PHP data crosses the server/client boundary.

```twig
{# Twig renders the JSON string, Vue receives it as a prop #}
:account="{{ account|vue_props_encode }}"

{# Static PHP value, no reactivity needed #}
:locale="'{{ app.request.locale }}'"
:max-size="{{ maxFileSizeBytes }}"
```

### Injecting PHP constants into Vue expressions

Constants and enums can be injected directly into Vue attribute values — Twig renders them as literal strings before Vue compiles the template.

```twig
v-if="block.type === '{{ constant('App\\Domain\\Block::TYPE_VIDEO') }}'"
:allowed-types="['{{ constant('App\\Domain\\Media::TYPE_IMAGE') }}', '{{ constant('App\\Domain\\Media::TYPE_PDF') }}']"
```

### Summary

```twig
{# ✓ Twig: server-side value injected as prop #}
:initial-count="{{ items|length }}"

{# ✓ Vue: reactive expression in the browser #}
<span>[[ count ]]</span>

{# ✓ Both: Twig renders the URL string, Vue evaluates it as JS #}
:url="{{ vue_path('api_item', {}, {id: 'item.id'}) }}"

{# ✗ Wrong: Twig delimiter inside x-template — use [[ ]] #}
<template id="...">{{ message }}</template>
```

---

## Components

### File naming convention

`.vue.twig` + `.vue.js` — immediately identifies Vue files among other Twig templates.

### Available components

#### `Behaviors/` — renderless components (no wrapper element, modify the child directly)

| Component | Description |
|---|---|
| `AutoResize` | Dynamically resizes a textarea/input to fit its content |

#### `Layout/` — structural containers

| Component | Description |
|---|---|
| `Modal` | Modal dialog with slot-based content |
| `LockWrapper` | Locks interaction on its content (loading state) |

#### `Controls/` — interaction primitives

| Component | Description |
|---|---|
| `DatePicker` | Date selection input |
| `DatetimePicker` | Date + time selection input |
| `DropZone` | File selection + validation + preview → emits `select` with files. Parent handles upload. |
| `UploadZone` | File selection + integrated upload (axios) + optional crop → emits `uploaded` with server response. |
| `ImageCropper` | Image crop UI |
| `SwitchButton` | Toggle switch |
| `ToggleButton` | Button that toggles between two states |

#### `Widgets/` — autonomous composite components

| Component | Description |
|---|---|
| `DataEditor` | Formalizes the editor pattern (`referenceData` + `checkForSave`) as a base component with slots |
| `DataList` | Formalizes the list pattern (CRUD + search + debounce) with a slot architecture |
| `NotificationBar` | Displays Symfony flash messages passed as a prop |

---

## `setup.js` — runtime configuration

Included automatically by `{% vue_app %}`. Configures:
- `VUE_APP.config.compilerOptions.delimiters = ['[[', ']]']` — avoids conflicts with Twig's `{{ }}`
- Global mixin: `format_date()`, `slugify()`
- `window.VUE_CONFIG` defaults (e.g. `debounceSearch: 300`)

Override after the opening tag if needed:

```twig
{% vue_app '#App' %}
    <script>VUE_CONFIG.debounceSearch = {{ debounce_ms }};</script>
    {% block BODY_CONTENT %}{% endblock %}
{% endvue_app %}
```

---

## Local development

To use the bundle from a local path instead of Packagist, add a path repository in the consuming project's `composer.json`:

```json
{
    "repositories": [
        { "type": "path", "url": "/absolute/path/to/vue-in-twig-bundle" }
    ],
    "require": {
        "mediagone/vue-in-twig-bundle": "*"
    }
}
```

Composer will symlink (or junction on Windows) the directory into `vendor/`. Changes to the library are immediately reflected.