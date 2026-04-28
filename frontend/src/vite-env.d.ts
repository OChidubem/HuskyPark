/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APPLE_MAPS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  mapkit?: {
    init: (options: { authorizationCallback: (done: (token: string) => void) => void }) => void;
    Padding?: new (top: number, right: number, bottom: number, left: number) => unknown;
    Map: new (
      element: HTMLElement,
      options?: Record<string, unknown>
    ) => {
      annotations?: Array<{ data?: { lotId?: number } }>;
      removeAnnotations?: (annotations: Array<{ data?: { lotId?: number } }>) => void;
      addAnnotations?: (annotations: Array<{ data?: { lotId?: number } }>) => void;
      showItems?: (items: Array<{ data?: { lotId?: number } }>, options?: unknown) => void;
      addEventListener?: (
        event: string,
        handler: (event: { annotation?: { data?: { lotId?: number } } }) => void
      ) => void;
      selectedAnnotation?: { data?: { lotId?: number } } | undefined;
      annotationForCluster?: unknown;
      destroyed?: boolean;
      destroy?: () => void;
      region?: unknown;
    };
    Coordinate: new (latitude: number, longitude: number) => unknown;
    CoordinateSpan: new (latitudeDelta: number, longitudeDelta: number) => unknown;
    CoordinateRegion: new (center: unknown, span: unknown) => unknown;
    MarkerAnnotation: new (
      coordinate: unknown,
      options?: Record<string, unknown>
    ) => { data?: { lotId?: number } };
    FeatureVisibility?: {
      Hidden?: string;
      Visible?: string;
      Adaptive?: string;
    };
    __huskyInitialized?: boolean;
  };
}
