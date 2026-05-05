declare module '@foam/graph-view/protocol' {
  export interface GraphStyle {
    style?: {
      background?: string;
      fontSize?: number;
      fontFamily?: string;
      lineColor?: string;
      lineWidth?: number;
      particleWidth?: number;
      highlightedForeground?: string;
      node?: Record<string, string | undefined>;
    };
    colorMode?: 'none' | 'directory' | 'type';
    groups?: Array<Record<string, unknown>>;
    showNodesOfType?: Record<string, boolean>;
  }

  export interface GraphViewConfig {
    name?: string;
    colorBy?: 'none' | 'directory' | 'type';
    groups?: Array<Record<string, unknown>>;
    show?: Record<string, { enabled?: boolean; color?: string }>;
    background?: string;
    fontSize?: number;
    fontFamily?: string;
    lineColor?: string;
  }

  export interface ShowGraphArgs {
    view?: string;
    config?: GraphViewConfig;
  }
}
