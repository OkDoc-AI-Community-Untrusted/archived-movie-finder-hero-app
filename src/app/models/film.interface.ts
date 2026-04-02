export interface FilmResult {
  identifier: string;
  title: string;
  description: string;
  downloads: number;
  mediatype: string;
  item_size?: number;
}

export interface MediaFile {
  name: string;
  format: string;
  size: string;
  url: string;
}

export interface AppState {
  searchQuery: string;
  searchResults: FilmResult[];
  currentFilm: FilmResult | null;
  videoUrl: string | null;
}
