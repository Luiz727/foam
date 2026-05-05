<div align="center">
<img src="assets/icon/FOAM_ICON_256.png" width="100"/>

# Foam Pro

Extensão local baseada no [Foam](https://foambubble.github.io/foam) com recursos adicionais de documentação de sistemas.

</div>

Foam Pro é uma extensão para VS Code baseada no projeto open source Foam. Permite criar uma base de conhecimento pessoal local, em Markdown, com wikilinks, grafos de relacionamento entre notas e **Sistema Explorer** — um módulo para documentar a estrutura de sistemas de software com hierarquia estilo Dendron e integração com o chat do VS Code.

## Recursos adicionais (Foam Pro)

### Sistema Explorer

Documente módulos, funções, páginas, backlog e ideias do seu sistema com hierarquia por pontos (`modulo.auth`, `funcao.auth.login`) diretamente no painel lateral.

- TreeView hierárquico por tipo
- Lookup estilo Dendron (`Ctrl+Shift+P` → `Foam: Sistema Lookup`)
- Validação de front matter por tipo (painel Problemas)
- Chat participant `@sistema` para criar estruturas via linguagem natural

### @sistema (Chat do VS Code)

```
@sistema crie módulo de autenticação com funções login, logout e refresh-token
@sistema quais funções existem no módulo pagamentos?
@sistema status
```

---

## Recursos base (Foam)

### Graph Visualization

See how your notes are connected via a [graph](https://foambubble.github.io/foam/user/features/graph-visualization) with the `Foam: Show Graph` command.

![Graph Visualization](./assets/screenshots/feature-show-graph.gif)

### Foam Queries

Embed dynamic, auto-updating lists, tables, and counts of notes directly in the Markdown preview using `foam-query` and `foam-query-js` code blocks.
See the [Foam Queries documentation](https://foambubble.github.io/foam/user/features/foam-queries) for the full reference.

![Foam queries](./assets/screenshots/foam-query.gif)

### Block IDs

Link or embed specific paragraphs, list items, headings, and blockquotes within a note using `[[note#^blockid]]` syntax.
Add a `^id` marker to any block element, then reference it from anywhere in your knowledge base.

![Block IDs](./assets/screenshots/block-ids.gif)

### Note embed

Embed the content from other notes. Embed entire notes, sections or even just blocks.

![Note Embed](./assets/screenshots/feature-note-embed.gif)

### Link Autocompletion

Foam helps you create the connections between your notes, and your placeholders as well.

![Link Autocompletion](./assets/screenshots/feature-link-autocompletion.gif)

### Sync links on file rename

Foam updates the links to renamed files, so your notes stay consistent.

![Sync links on file rename](./assets/screenshots/feature-link-sync.gif)

### Unique identifiers across directories

Foam supports files with the same name in multiple directories.
It will use the minimum identifier required, and even report and help you fix existing ambiguous wikilinks.

![Unique identifier autocompletion](./assets/screenshots/feature-unique-wikilink-completion.gif)

![Wikilink diagnostic](./assets/screenshots/feature-wikilink-diagnostics.gif)

### Link Preview and Navigation

![Link Preview and Navigation](./assets/screenshots/feature-navigation.gif)

### Go to definition, Peek References

See where a note is being referenced in your knowledge base.

![Go to Definition, Peek References](./assets/screenshots/feature-definition-references.gif)

### Navigation in Preview

Navigate your rendered notes in the VS Code preview panel.

![Navigation in Preview](./assets/screenshots/feature-preview-navigation.gif)

### Support for sections

Foam supports autocompletion, navigation, embedding and diagnostics for note sections.
Just use the standard wiki syntax of `[[resource#Section Title]]`.

### Link Alias

Foam supports link aliasing, so you can have a `[[wikilink]]`, or a `[[wikilink|alias]]`.

### Templates

Use [custom templates](https://foambubble.github.io/foam/user/features/templates) to have avoid repetitve work on your notes.

![Templates](./assets/screenshots/feature-templates.gif)

### Backlinks Panel

Quickly check which notes are referencing the currently active note.
See for each occurrence the context in which it lives, as well as a preview of the note.

![Backlinks Panel](./assets/screenshots/feature-backlinks-panel.gif)

### Tag Explorer Panel

Tag your notes and navigate them with the [Tag Explorer](https://foambubble.github.io/foam/user/features/tags).
Foam also supports hierarchical tags.

![Tag Explorer Panel](./assets/screenshots/feature-tags-panel.gif)

### Orphans and Placeholder Panels

Orphans are note that have no inbound nor outbound links.
Placeholders are dangling links, or notes without content.
Keep them under control, and your knowledge base in better state, by using this panel.

![Orphans and Placeholder Panels](./assets/screenshots/feature-placeholder-orphan-panel.gif)

### Syntax highlight

Foam highlights wikilinks and placeholder differently, to help you visualize your knowledge base.

![Syntax Highlight](./assets/screenshots/feature-syntax-highlight.png)

### Daily note

Create a journal with [daily notes](https://foambubble.github.io/foam/user/features/daily-notes).

![Daily Note](./assets/screenshots/feature-daily-note.gif)

### Generate references for your wikilinks

Create markdown [references](https://foambubble.github.io/foam/user/features/link-reference-definitions) for `[[wikilinks]]`, to use your notes in a non-Foam workspace.
With references you can also make your notes navigable both in GitHub UI as well as GitHub Pages.

![Generate references](./assets/screenshots/feature-definitions-generation.gif)

### Commands

- Explore your knowledge base with the `Foam: Open Random Note` command
- Access your daily note with the `Foam: Open Daily Note` command
- Create a new note with the `Foam: Create New Note` command
  - This becomes very powerful when combined with [note templates](https://foambubble.github.io/foam/user/features/templates) and the `Foam: Create New Note from Template` command
- See your workspace as a connected graph with the `Foam: Show Graph` command
- And many [more](https://foambubble.github.io/foam/user/features/commands)

## Recipes

People use Foam in different ways for different use cases, check out the [recipes](https://foambubble.github.io/foam/user/recipes/recipes) page for inspiration!

## Getting started

You really, _really_, **really** should read [Foam documentation](https://foambubble.github.io/foam), but if you can't be bothered, this is how to get started:

1. [Create a GitHub repository from foam-template](https://github.com/foambubble/foam-template/generate). If you want to keep your thoughts to yourself, remember to set the repository private.
2. Clone the repository and open it in VS Code.
3. When prompted to install recommended extensions, click **Install all** (or **Show Recommendations** if you want to review and install them one by one).

This will also install `Foam`, but if you already have it installed, that's ok, just make sure you're up to date on the latest version.

## Known Issues

See the [issues](https://github.com/foambubble/foam/issues/) on our GitHub repo ;)

## Release Notes

See the [CHANGELOG](CHANGELOG.md).
