# Architecture Reference — mediagone/vue-in-twig-bundle

Technical implementation reference. Intended for maintainers and AI assistants working on this codebase.

---

## Purpose

This bundle formalizes a Twig/Vue integration pattern where:
- Vue components are written as **x-templates** (not SFC `.vue` files)
- Twig renders and composes components **server-side**
- There is **no Node.js/npm ecosystem**, no bundler, no build step
- Vue 3 (full build with compiler) is loaded as a plain `<script>` tag

The x-template approach is intentional and is the core value of the bundle: it lets Twig write inside Vue templates (inject PHP constants, Symfony URLs, initial data).

---

## File structure

```
src/
├── VueInTwigBundle.php             # Symfony Bundle entry point
└── Twig/
    ├── VueInTwigExtension.php      # Twig AbstractExtension — registers filter, functions, and token parser
    ├── VueAppTokenParser.php       # Parses {% vue_app %}...{% endvue_app %} at compile time
    └── VueAppNode.php              # Compiles the tag to PHP at template compile time

templates/
├── setup.js                        # Included by {% vue_app %} — configures Vue delimiters and global mixin
├── Behaviors/                      # Renderless components (no wrapper DOM element)
│   └── AutoResize.vue.js
├── Layout/                         # Structural container components
│   ├── Modal.vue.twig + Modal.vue.js
│   └── LockWrapper.vue.twig + LockWrapper.vue.js
├── Controls/                       # Interaction primitives
│   ├── DatePicker.vue.twig + DatePicker.vue.js
│   ├── DatetimePicker.vue.twig + DatetimePicker.vue.js
│   ├── DropZone.vue.twig + DropZone.vue.js
│   ├── ImageCropper.vue.twig + ImageCropper.vue.js
│   ├── SwitchButton.vue.twig + SwitchButton.vue.js
│   ├── ToggleButton.vue.twig + ToggleButton.vue.js
│   └── UploadZone.vue.twig + UploadZone.vue.js
└── Widgets/                        # Autonomous composite components
    ├── DataEditor.vue.twig + DataEditor.vue.js
    ├── DataList.vue.twig + DataList.vue.js
    └── NotificationBar.vue.twig + NotificationBar.vue.js
```

---

## Bundle bootstrap (`VueInTwigBundle`)

`src/VueInTwigBundle.php` — extends `AbstractBundle`, implements `PrependExtensionInterface`.

Two responsibilities:

1. **`prepend()`** — registers the `templates/` directory under the Twig namespace `@VueInTwig/` automatically, so the consuming project does not need to configure `twig.yaml`.

2. **`loadExtension()`** — registers `VueInTwigExtension` as a Symfony service with the `twig.extension` tag, autowired (injects `UrlGeneratorInterface`).

---

## Twig extension (`VueInTwigExtension`)

`src/Twig/VueInTwigExtension.php` — extends `AbstractExtension`.

### Component queue

Holds a `private array $queue` that accumulates component names registered via `vue_use()` during a template render. Exposes:
- `vueUse(string $component): string` — adds to queue if not already present, returns `''` (silent)
- `resetQueue(): void` — called by `VueAppNode` at the start of each `{% vue_app %}` render
- `getQueue(): array` — called by `VueAppNode` at `{% endvue_app %}` to iterate registered components

The queue is request-scoped (the extension is a singleton service per request).

### Registered Twig API

| Type | Name | Description |
|---|---|---|
| Filter | `\|vue_json_encode` | `json_encode` with `JSON_HEX_TAG\|APOS\|AMP\|QUOT\|THROW_ON_ERROR` + `is_safe: html` |
| Function | `vue_use(component)` | Adds component to queue, returns `''` |
| Function | `vue_path(route, static, dynamic)` | Generates Symfony URL with Vue expression placeholders |
| Token parser | `{% vue_app %}` | Registered via `getTokenParsers()` → `VueAppTokenParser` |

### `vue_path()` implementation

Takes three arguments:
- `$route` — Symfony route name
- `$staticParams` — array of static parameters passed as-is to the router
- `$dynamicParams` — array of `[paramName => vueExpression]`

For each dynamic param, generates a placeholder `__PARAMNAME__` (uppercased key). Calls `$urlGenerator->generate($route, array_merge($staticParams, $placeholders))`, then chains `.replace('__PARAMNAME__', vueExpression)` for each dynamic param.

Example: `vue_path('my_route', {fields:'full'}, {accountId:'account.id'})` generates:
```javascript
'/my-route?fields=full&accountId=__ACCOUNTID__'.replace('__ACCOUNTID__', account.id)
```

---

## Token parser (`VueAppTokenParser`)

`src/Twig/VueAppTokenParser.php` — extends `AbstractTokenParser`.

Parses `{% vue_app 'selector' %}...{% endvue_app %}` at **Twig compile time**.

- `getTag()` returns `'vue_app'`
- `parse()` reads the selector expression, then calls `subparse()` to capture the body until `endvue_app`, returns a `VueAppNode`
- Uses `$this->parser` (set by `AbstractTokenParser`) — the `Parser` is **not** a second method parameter (the interface only takes `Token $token`)

---

## Compiled node (`VueAppNode`)

`src/Twig/VueAppNode.php` — extends `Node`.

`compile(Compiler $compiler)` generates PHP code that runs **at template render time**. The generated output order is:

```
1. $extension->resetQueue()
2. yield '<script>window.VUE_APP = Vue.createApp({});</script>'
3. yield $env->render('@VueInTwig/setup.js', $context)       ← setup.js included here
4. [body nodes compiled — vue_use() calls fill the queue silently]
5. foreach ($extension->getQueue() as $component):
       if @VueInTwig/$component.vue.twig exists → yield render(...)
       if @VueInTwig/$component.vue.js exists  → yield '<script>' . render(...) . '</script>'
6. yield '<script>VUE_APP.mount("selector");</script>'
```

Key points:
- Uses `yield` (Twig 3 generator-based compiled templates)
- Component existence is checked via `$env->getLoader()->exists()`; missing files are silently skipped (a component can have only `.vue.js` and no `.vue.twig`, e.g. `Behaviors/AutoResize`)
- The extension singleton is retrieved at render time via `$env->getExtension(VueInTwigExtension::class)`
- `setup.js` is rendered as a Twig template (supports Twig syntax if needed) and output **inline** (not wrapped in `<script>` — the file itself contains raw JS)

---

## Component file conventions

Each component consists of up to two files in `templates/`:

| File | Role |
|---|---|
| `Category/Name.vue.twig` | x-template: `<script type="text/x-template" id="tpl-name">...</script>` with Vue markup. May contain Twig syntax (constants, urls, etc.). Delimiters must be `[[ ]]`. |
| `Category/Name.vue.js` | Component registration: `VUE_APP.component('vue-name', { template: '#tpl-name', ... })`. Plain JS, no Twig syntax needed. |

`Behaviors/` components have no `.vue.twig` (they use render functions, not templates).

### Component categories

- **`Behaviors/`** — renderless: use a render function returning `this.$slots.default[0]` directly, apply styles/behavior to the child element. No DOM wrapper.
- **`Layout/`** — structural containers with their own DOM element.
- **`Controls/`** — interaction primitives (inputs, pickers, file upload).
- **`Widgets/`** — autonomous composites, typically managing their own XHR state.

---

## `setup.js`

Output verbatim inside a `<script>` block by `VueAppNode` (opening tag). Configures the Vue application before components are registered and before mount:

- `window.VUE_CONFIG ??= { debounceSearch: 300 }` — global config with project-overridable defaults
- `VUE_APP.config.compilerOptions.delimiters = ['[[', ']]']` — avoids conflict with Twig's `{{ }}`
- `VUE_APP.mixin({ methods: { format_date, slugify } })` — global utility methods

The consuming project can override `VUE_CONFIG` values in a `<script>` block placed inside the `{% vue_app %}` body, before `{% endvue_app %}`.

---

## Twig namespace

The `@VueInTwig/` namespace maps to the bundle's `templates/` directory, configured automatically via `PrependExtensionInterface::prepend()`. Path resolution at render time uses `__DIR__ . '/../templates'` relative to `src/VueInTwigBundle.php`.

---

## Autoload

`composer.json` maps `Mediagone\VueInTwigBundle\` → `src/` (PSR-4). All PHP classes, including `VueInTwigBundle` itself, live under `src/`.
