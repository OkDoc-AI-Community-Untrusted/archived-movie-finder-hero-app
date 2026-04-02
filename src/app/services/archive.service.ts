import { Injectable } from '@angular/core';
import { FilmResult, MediaFile } from '../models/film.interface';
import {
  ARCHIVE_SEARCH_URL,
  ARCHIVE_METADATA_URL,
  ARCHIVE_DOWNLOAD_URL,
  SEARCH_ROWS,
  MIN_FILE_SIZE_BYTES,
} from '../constants';

@Injectable({ providedIn: 'root' })
export class ArchiveService {

  async searchFilms(query: string): Promise<FilmResult[]> {
    const url =
      `${ARCHIVE_SEARCH_URL}?q=(mediatype:movies)+AND+title:(${encodeURIComponent(query)})` +
      `+AND+NOT+title:(trailer OR sample OR clip OR promo)` +
      `+AND+item_size:[${MIN_FILE_SIZE_BYTES} TO *]` +
      `&fl[]=identifier,title,description,downloads,mediatype,item_size` +
      `&sort[]=item_size+desc&rows=${SEARCH_ROWS}&page=1&output=json`;

    const response = await fetch(url);
    const data = await response.json();
    const docs: FilmResult[] = data.response?.docs || [];
    docs.sort((a: FilmResult, b: FilmResult) => (b.item_size || 0) - (a.item_size || 0));
    return docs;
  }

  async fetchMediaFiles(identifier: string, mediatype: string): Promise<MediaFile[]> {
    const url = `${ARCHIVE_METADATA_URL}/${identifier}`;
    const response = await fetch(url);
    const data = await response.json();
    const files: Record<string, unknown>[] = data.files || [];
    const isAudio = mediatype === 'audio';

    if (isAudio) {
      return files
        .filter((f: Record<string, unknown>) =>
          String(f['name']).endsWith('.mp3') || String(f['format']).includes('MP3')
        )
        .map((f: Record<string, unknown>) => ({
          name: String(f['name']),
          format: String(f['format']),
          size: String(f['size']),
          url: `${ARCHIVE_DOWNLOAD_URL}/${identifier}/${f['name']}`,
        }) as MediaFile);
    }

    return files
      .filter((f: Record<string, unknown>) =>
        String(f['name']).endsWith('.mp4') || String(f['format']).includes('MPEG4')
      )
      .map((f: Record<string, unknown>) => ({
        name: String(f['name']),
        format: String(f['format']),
        size: String(f['size']),
        url: `${ARCHIVE_DOWNLOAD_URL}/${identifier}/${f['name']}`,
      }) as MediaFile);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
