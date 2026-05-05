import * as vscode from 'vscode';
import { FoamWorkspace, Resource } from '@foam/core';
import { toVsCodeUri } from '../../utils/vsc-utils';
import { SYSTEM_ITEM_TYPES, SYSTEM_TYPE_META, SystemItemType } from './index';

// ── Trie ─────────────────────────────────────────────────────────────────

type TrieNode = {
  note?: Resource;
  children: Map<string, TrieNode>;
};

function buildTrie(notes: Resource[]): TrieNode {
  const root: TrieNode = { children: new Map() };
  for (const note of notes) {
    const name = note.uri.getName();
    const segments = name.split('.');
    let cur = root;
    for (const seg of segments) {
      if (!cur.children.has(seg)) {
        cur.children.set(seg, { children: new Map() });
      }
      cur = cur.children.get(seg)!;
    }
    cur.note = note;
  }
  return root;
}

function segmentToTitle(segment: string): string {
  return segment
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Tree Items ────────────────────────────────────────────────────────────

export type SystemTreeItem = SystemGroupItem | SystemTreeNode;

export class SystemGroupItem extends vscode.TreeItem {
  public readonly type: SystemItemType;

  constructor(type: SystemItemType, count: number) {
    const meta = SYSTEM_TYPE_META[type];
    super(
      `${meta.label} (${count})`,
      count > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );
    this.type = type;
    this.iconPath = new vscode.ThemeIcon(meta.icon.replace('$(', '').replace(')', ''));
    this.contextValue = 'foam.system.group';
    this.tooltip = meta.description;
  }
}

export class SystemTreeNode extends vscode.TreeItem {
  constructor(
    public readonly segment: string,
    public readonly trieNode: TrieNode,
    public readonly resource: Resource | undefined
  ) {
    const hasChildren = trieNode.children.size > 0;
    const displayTitle = resource
      ? (resource.properties?.title as string) ?? segmentToTitle(segment)
      : segmentToTitle(segment);

    super(
      displayTitle,
      hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
    );

    if (resource) {
      this.resourceUri = toVsCodeUri(resource.uri);
      this.command = {
        command: 'vscode.open',
        title: 'Abrir',
        arguments: [this.resourceUri],
      };
      this.iconPath = hasChildren ? new vscode.ThemeIcon('file-directory') : vscode.ThemeIcon.File;
      this.description = (resource.properties?.status as string) ?? '';
    } else {
      // Stub: nó intermediário sem nota real
      this.iconPath = new vscode.ThemeIcon('folder');
      this.description = '';
    }

    this.contextValue = resource ? 'foam.system.note' : 'foam.system.stub';
    this.tooltip = displayTitle;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────

export class SystemExplorerProvider implements vscode.TreeDataProvider<SystemTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SystemTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private trieByType: Map<SystemItemType, TrieNode> = new Map();
  private countByType: Map<SystemItemType, number> = new Map();

  constructor(private readonly workspace: FoamWorkspace) {
    this.buildIndex();
  }

  private buildIndex() {
    const notesByType = new Map<SystemItemType, Resource[]>();
    for (const type of SYSTEM_ITEM_TYPES) {
      notesByType.set(type, []);
    }
    for (const resource of this.workspace.resources()) {
      const type = resource.properties?.type as string | undefined;
      if (type && SYSTEM_ITEM_TYPES.includes(type as SystemItemType)) {
        notesByType.get(type as SystemItemType)!.push(resource);
      }
    }
    this.trieByType = new Map();
    this.countByType = new Map();
    for (const type of SYSTEM_ITEM_TYPES) {
      const notes = notesByType.get(type)!;
      this.trieByType.set(type, buildTrie(notes));
      this.countByType.set(type, notes.length);
    }
  }

  refresh() {
    this.buildIndex();
    this._onDidChangeTreeData.fire();
  }

  dispose() {
    this._onDidChangeTreeData.dispose();
  }

  getTreeItem(element: SystemTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SystemTreeItem): SystemTreeItem[] {
    if (!element) {
      return SYSTEM_ITEM_TYPES.map(
        type => new SystemGroupItem(type, this.countByType.get(type) ?? 0)
      );
    }
    if (element instanceof SystemGroupItem) {
      const trie = this.trieByType.get(element.type);
      if (!trie) return [];
      return this.trieToItems(trie);
    }
    if (element instanceof SystemTreeNode && element.trieNode.children.size > 0) {
      return this.trieToItems(element.trieNode);
    }
    return [];
  }

  private trieToItems(node: TrieNode): SystemTreeNode[] {
    return Array.from(node.children.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([segment, child]) => new SystemTreeNode(segment, child, child.note));
  }
}
