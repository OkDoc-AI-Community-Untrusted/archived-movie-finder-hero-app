import { ChangeDetectionStrategy, Component, OnInit, signal, computed, effect, ElementRef, inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FilmResult, MediaFile } from './models/film.interface';
import { ArchiveService } from './services/archive.service';
import { StorageService } from './services/storage.service';
import { PLAYBACK_RATES, SKIP_SECONDS } from './constants';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [FormsModule, MatIconModule],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly archiveService = inject(ArchiveService);
  private readonly storageService = inject(StorageService);

  readonly playbackRates = PLAYBACK_RATES;

  readonly searchQuery = signal('');
  readonly searchResults = signal<FilmResult[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly error = signal<string | null>(null);

  readonly videoResults = computed(() => this.searchResults().filter(f => f.mediatype === 'movies'));

  readonly currentFilm = signal<FilmResult | null>(null);
  readonly videoUrl = signal<string | null>(null);
  readonly isLoadingVideo = signal(false);

  readonly mediaFiles = signal<MediaFile[]>([]);
  readonly currentQuality = signal<string | null>(null);

  readonly volume = signal(1);
  readonly isMuted = signal(false);
  readonly playbackRate = signal(1);
  readonly isPlaying = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly progressPercentage = computed(() => {
    if (this.duration() === 0) {
      return 0;
    }
    return (this.currentTime() / this.duration()) * 100;
  });
  readonly isFocused = signal(false);
  readonly isFullscreen = signal(false);
  readonly isBuffering = signal(false);
  readonly showVolumePopup = signal(false);
  readonly showSettingsPopup = signal(false);

  @ViewChild('videoPlayer') readonly videoPlayer!: ElementRef<HTMLVideoElement>;

  constructor() {
    const saved = this.storageService.loadState();
    if (saved) {
      if (saved.searchQuery) {
        this.searchQuery.set(saved.searchQuery);
      }
      if (saved.searchResults) {
        this.searchResults.set(saved.searchResults);
      }
      if (saved.currentFilm) {
        this.currentFilm.set(saved.currentFilm);
        if (saved.videoUrl) {
          this.videoUrl.set(saved.videoUrl);
        }
      }
    }

    effect(() => {
      this.storageService.saveState({
        searchQuery: this.searchQuery(),
        searchResults: this.searchResults(),
        currentFilm: this.currentFilm(),
        videoUrl: this.videoUrl(),
      });
    });
  }

  ngOnInit(): void {
    this.initOkDoc();
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', () => {
        this.isFullscreen.set(!!document.fullscreenElement);
      });
      document.addEventListener('webkitfullscreenchange', () => {
        this.isFullscreen.set(!!(document as unknown as Record<string, unknown>)['webkitFullscreenElement']);
      });
    }
  }

  initOkDoc(): void {
    if (typeof OkDoc === 'undefined') {
      return;
    }

    OkDoc.init({
      id: 'archive-film-finder-hero-app',
      name: 'Archive Film Finder Hero App',
      namespace: 'archive_film',
      version: '1.0.0',
      description: 'Search and play classic feature films from the Web Archive',
      icon: 'film-outline',
      mode: 'foreground',
      author: { name: 'AI Builder', url: 'https://example.com' },
    });

    OkDoc.registerTool('search_films', {
      description: 'Search for feature films in the Web Archive',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., matrix, night)' },
        },
        required: ['query'],
      },
      handler: async (args: Record<string, unknown>) => {
        this.searchQuery.set(String(args['query']));
        await this.searchFilms();

        const results = this.searchResults();
        if (results.length === 0) {
          return { content: [{ type: 'text', text: 'No results found.' }] };
        }

        const list = results.slice(0, 20).map((f, i) =>
          `${i + 1}. ${f.title} (identifier: ${f.identifier}, type: ${f.mediatype}, downloads: ${f.downloads}, size: ${this.archiveService.formatSize(f.item_size || 0)})`
        ).join('\n');
        return { content: [{ type: 'text', text: `Found ${results.length} results:\n${list}\n\nUse select_film with the identifier to play a film.` }] };
      },
    });

    OkDoc.registerTool('select_film', {
      description: 'Select a film to play by its identifier',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'The identifier of the film from search results' },
        },
        required: ['identifier'],
      },
      handler: async (args: Record<string, unknown>) => {
        const identifier = String(args['identifier']);
        const film = this.searchResults().find(f => f.identifier === identifier);

        if (film) {
          await this.selectFilm(film);
        } else {
          await this.selectFilmByIdentifier(identifier);
        }

        return { content: [{ type: 'text', text: `Selected item: ${identifier}. Fetching media URL...` }] };
      },
    });

    OkDoc.registerTool('play_video', {
      description: 'Play the currently loaded media',
      handler: async () => {
        if (this.videoPlayer?.nativeElement) {
          try {
            await this.videoPlayer.nativeElement.play();
            return { content: [{ type: 'text', text: 'Playback started.' }] };
          } catch (e) {
            return { content: [{ type: 'text', text: `Playback failed: ${e}` }] };
          }
        }
        return { content: [{ type: 'text', text: 'No media loaded to play.' }] };
      },
    });

    OkDoc.registerTool('pause_video', {
      description: 'Pause the currently playing media',
      handler: async () => {
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.pause();
          return { content: [{ type: 'text', text: 'Playback paused.' }] };
        }
        return { content: [{ type: 'text', text: 'No media loaded to pause.' }] };
      },
    });

    OkDoc.registerTool('skip_media', {
      description: 'Skip forward or backward in the media',
      inputSchema: {
        type: 'object',
        properties: {
          seconds: { type: 'number', description: 'Seconds to skip (positive for forward, negative for backward)' },
        },
        required: ['seconds'],
      },
      handler: async (args: Record<string, unknown>) => {
        const seconds = Number(args['seconds']);
        this.skip(seconds);
        return { content: [{ type: 'text', text: `Skipped ${seconds > 0 ? 'forward' : 'backward'} by ${Math.abs(seconds)} seconds.` }] };
      },
    });

    OkDoc.registerTool('set_volume', {
      description: 'Set the playback volume',
      inputSchema: {
        type: 'object',
        properties: {
          level: { type: 'number', description: 'Volume level from 0.0 to 1.0' },
        },
        required: ['level'],
      },
      handler: async (args: Record<string, unknown>) => {
        const level = Math.max(0, Math.min(1, Number(args['level'])));
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.volume = level;
          this.volume.set(level);
          if (level > 0 && this.isMuted()) {
            this.toggleMute();
          }
          return { content: [{ type: 'text', text: `Volume set to ${Math.round(level * 100)}%.` }] };
        }
        return { content: [{ type: 'text', text: 'No media loaded.' }] };
      },
    });

    OkDoc.registerTool('toggle_mute', {
      description: 'Toggle mute on or off',
      handler: async () => {
        this.toggleMute();
        return { content: [{ type: 'text', text: `Media is now ${this.isMuted() ? 'muted' : 'unmuted'}.` }] };
      },
    });

    OkDoc.registerTool('set_playback_rate', {
      description: 'Set the playback speed/rate',
      inputSchema: {
        type: 'object',
        properties: {
          rate: { type: 'number', description: 'Playback rate (e.g., 0.5, 1, 1.25, 1.5, 2)' },
        },
        required: ['rate'],
      },
      handler: async (args: Record<string, unknown>) => {
        const rate = Number(args['rate']);
        this.setPlaybackRate(rate);
        return { content: [{ type: 'text', text: `Playback rate set to ${rate}x.` }] };
      },
    });

    OkDoc.registerTool('set_quality', {
      description: 'Set the media quality/format',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', description: 'Format string (e.g., "512Kbps MP4", "VBR MP3")' },
        },
        required: ['format'],
      },
      handler: async (args: Record<string, unknown>) => {
        const format = String(args['format']);
        this.setQuality(format);
        return { content: [{ type: 'text', text: `Requested quality change to ${format}.` }] };
      },
    });

    OkDoc.registerTool('clear_search', {
      description: 'Clear the current search results and query',
      handler: async () => {
        this.clearSearch();
        return { content: [{ type: 'text', text: 'Search results cleared.' }] };
      },
    });

    OkDoc.registerTool('close_media', {
      description: 'Close the currently playing media',
      handler: async () => {
        this.closeMedia();
        return { content: [{ type: 'text', text: 'Media closed.' }] };
      },
    });

    OkDoc.registerTool('toggle_focus', {
      description: 'Toggle focus mode (hides everything except the video player)',
      handler: async () => {
        this.toggleFocus();
        return { content: [{ type: 'text', text: `Focus mode is now ${this.isFocused() ? 'ON' : 'OFF'}.` }] };
      },
    });

    OkDoc.registerTool('toggle_fullscreen', {
      description: 'Toggle fullscreen mode for the video player',
      handler: async () => {
        await this.toggleFullscreen();
        return { content: [{ type: 'text', text: 'Toggled fullscreen.' }] };
      },
    });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.error.set(null);
  }

  closeMedia(): void {
    this.currentFilm.set(null);
    this.videoUrl.set(null);
    this.mediaFiles.set([]);
    this.currentQuality.set(null);
    this.isPlaying.set(false);
    this.isFocused.set(false);
  }

  formatSize(bytes: number): string {
    return this.archiveService.formatSize(bytes);
  }

  async searchFilms(): Promise<void> {
    const query = this.searchQuery().trim();
    if (!query) {
      return;
    }

    this.isSearching.set(true);
    this.error.set(null);
    this.hasSearched.set(true);

    try {
      const docs = await this.archiveService.searchFilms(query);
      this.searchResults.set(docs);
    } catch {
      this.error.set('Failed to search. Please try again.');
      this.searchResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  async selectFilm(film: FilmResult): Promise<void> {
    this.currentFilm.set(film);
    await this.fetchMediaUrl(film.identifier);
  }

  async selectFilmByIdentifier(identifier: string): Promise<void> {
    this.currentFilm.set({ identifier, title: identifier, description: '', downloads: 0, mediatype: 'unknown' });
    await this.fetchMediaUrl(identifier);
  }

  async fetchMediaUrl(identifier: string): Promise<void> {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.pause();
    }
    this.isLoadingVideo.set(true);
    this.isBuffering.set(false);
    this.error.set(null);
    this.videoUrl.set(null);
    this.mediaFiles.set([]);
    this.currentQuality.set(null);

    try {
      const mediatype = this.currentFilm()?.mediatype ?? 'movies';
      const validFiles = await this.archiveService.fetchMediaFiles(identifier, mediatype);

      if (validFiles.length > 0) {
        this.mediaFiles.set(validFiles);
        this.videoUrl.set(validFiles[0].url);
        this.currentQuality.set(validFiles[0].format);
      } else {
        const isAudio = mediatype === 'audio';
        this.error.set(`Could not find an ${isAudio ? 'MP3' : 'MP4'} link for this item.`);
      }
    } catch {
      this.error.set('Failed to fetch media details.');
    } finally {
      this.isLoadingVideo.set(false);
    }
  }

  skip(seconds: number): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime += seconds;
    }
  }

  togglePlay(): void {
    if (!this.videoPlayer?.nativeElement) {
      return;
    }
    if (this.videoPlayer.nativeElement.paused) {
      this.videoPlayer.nativeElement.play().catch(() => {});
    } else {
      this.videoPlayer.nativeElement.pause();
    }
  }

  toggleMute(): void {
    if (this.videoPlayer?.nativeElement) {
      const muted = !this.isMuted();
      this.videoPlayer.nativeElement.muted = muted;
      this.isMuted.set(muted);
    }
  }

  setVolume(event: Event): void {
    const target = event.target as HTMLInputElement;
    const vol = parseFloat(target.value);
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.volume = vol;
      this.volume.set(vol);
      if (vol > 0 && this.isMuted()) {
        this.toggleMute();
      }
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.playbackRate = rate;
      this.playbackRate.set(rate);
    }
  }

  setQuality(format: string): void {
    const file = this.mediaFiles().find(f => f.format === format);
    if (!file || !this.videoPlayer?.nativeElement) {
      return;
    }

    const savedTime = this.videoPlayer.nativeElement.currentTime;
    const isPaused = this.videoPlayer.nativeElement.paused;

    this.videoPlayer.nativeElement.pause();
    this.isBuffering.set(true);
    this.videoUrl.set(file.url);
    this.currentQuality.set(format);

    const onCanPlay = (): void => {
      if (this.videoPlayer?.nativeElement) {
        this.videoPlayer.nativeElement.removeEventListener('canplay', onCanPlay);
        this.videoPlayer.nativeElement.currentTime = savedTime;
        if (!isPaused) {
          this.videoPlayer.nativeElement.play().catch(() => {});
        }
      }
    };
    // Wait for next tick so Angular updates the src binding
    setTimeout(() => {
      if (this.videoPlayer?.nativeElement) {
        this.videoPlayer.nativeElement.addEventListener('canplay', onCanPlay, { once: true });
      }
    }, 0);
  }

  onPlay(): void {
    this.isPlaying.set(true);
    if (typeof OkDoc !== 'undefined') {
      OkDoc.notify('Player state changed: Playing');
    }
  }

  onPause(): void {
    this.isPlaying.set(false);
    if (typeof OkDoc !== 'undefined') {
      OkDoc.notify('Player state changed: Paused');
    }
  }

  onVideoLoaded(): void {
    this.isLoadingVideo.set(false);
    this.isBuffering.set(false);
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.volume = this.volume();
      this.videoPlayer.nativeElement.muted = this.isMuted();
      this.videoPlayer.nativeElement.playbackRate = this.playbackRate();
      this.duration.set(this.videoPlayer.nativeElement.duration || 0);
    }
  }

  onVideoWaiting(): void {
    this.isBuffering.set(true);
  }

  onVideoPlaying(): void {
    this.isBuffering.set(false);
  }

  onTimeUpdate(): void {
    if (this.videoPlayer?.nativeElement) {
      this.currentTime.set(this.videoPlayer.nativeElement.currentTime);
    }
  }

  seekTo(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;

    if (this.videoPlayer?.nativeElement) {
      const newTime = percentage * this.duration();
      this.videoPlayer.nativeElement.currentTime = newTime;
      this.currentTime.set(newTime);
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) {
      return '00:00';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  toggleFocus(): void {
    this.isFocused.update(f => !f);
  }

  toggleVolumePopup(): void {
    this.showSettingsPopup.set(false);
    this.showVolumePopup.update(v => !v);
  }

  toggleSettingsPopup(): void {
    this.showVolumePopup.set(false);
    this.showSettingsPopup.update(v => !v);
  }

  async toggleFullscreen(): Promise<void> {
    if (!this.videoPlayer?.nativeElement) {
      return;
    }

    const elem = this.videoPlayer.nativeElement;

    if (!document.fullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as unknown as Record<string, () => void>)['webkitRequestFullscreen']) {
          (elem as unknown as Record<string, () => void>)['webkitRequestFullscreen']();
        }
      } catch {
        // Fullscreen blocked by iframe without allow="fullscreen" — fall back to focus mode
        if (!this.isFocused()) {
          this.isFocused.set(true);
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as unknown as Record<string, () => void>)['webkitExitFullscreen']) {
        (document as unknown as Record<string, () => void>)['webkitExitFullscreen']();
      }
    }
  }

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.error && video.error.code === 1) {
      // MEDIA_ERR_ABORTED — usually happens when changing src, ignore
      return;
    }
    this.isLoadingVideo.set(false);
    this.error.set('Error loading media playback.');
  }
}

