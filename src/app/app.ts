import { ChangeDetectionStrategy, Component, OnInit, signal, computed, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface FilmResult {
  identifier: string;
  title: string;
  description: string;
  downloads: number;
  mediatype: string;
  item_size?: number;
}

interface MediaFile {
  name: string;
  format: string;
  size: string;
  url: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 font-sans overflow-x-hidden" [class.overflow-hidden]="isFocused()">
      <div class="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <header class="text-center space-y-2" [class.hidden]="isFocused()">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">Film Player</h1>
          <p class="text-sm sm:text-base text-zinc-400">Search and play classic feature films from the Web Archive</p>
        </header>

        <div class="relative flex items-center" [class.hidden]="isFocused()">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (keyup.enter)="searchFilms()"
            placeholder="Search for a film (e.g., matrix, night)..."
            class="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-32 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div class="absolute right-2 flex gap-1">
            @if (searchResults().length > 0 || hasSearched() || searchQuery()) {
              <button 
                (click)="clearSearch()"
                class="p-2 text-zinc-400 hover:text-white transition-colors"
                title="Clear Search"
              >
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            }
            <button 
              (click)="searchFilms()"
              [disabled]="isSearching()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
            >
              {{ isSearching() ? '...' : 'Search' }}
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-xl" [class.hidden]="isFocused()">
            {{ error() }}
          </div>
        }

        @if (currentFilm()) {
          <div 
            class="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl transition-all duration-300"
            [class.fixed]="isFocused()"
            [class.inset-0]="isFocused()"
            [class.z-50]="isFocused()"
            [class.rounded-none]="isFocused()"
            [class.border-none]="isFocused()"
            [class.flex]="isFocused()"
            [class.flex-col]="isFocused()"
          >
            <div class="bg-black relative" [class.aspect-video]="!isFocused()" [class.flex-1]="isFocused()" [class.min-h-0]="isFocused()">
              @if (isLoadingVideo()) {
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                </div>
              }
              @if (videoUrl()) {
                <video 
                  #videoPlayer
                  [src]="videoUrl()" 
                  autoplay
                  [controls]="isFullscreen()"
                  class="w-full h-full object-contain"
                  (play)="onPlay()"
                  (pause)="onPause()"
                  (loadeddata)="onVideoLoaded()"
                  (error)="onVideoError($event)"
                  (timeupdate)="onTimeUpdate()"
                ></video>
              }
            </div>
            
            <div class="bg-zinc-800 border-b border-zinc-700 shrink-0">
              <!-- Progress Bar -->
              <div class="w-full h-2 bg-zinc-700 cursor-pointer relative group" (click)="seekTo($event)">
                <div 
                  class="h-full bg-indigo-500 relative" 
                  [style.width.%]="progressPercentage()"
                >
                  <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2"></div>
                </div>
              </div>

              <!-- Controls -->
              <div class="p-4 flex flex-wrap items-center gap-2 sm:gap-4">
                <button (click)="skip(-10)" class="p-2 hover:bg-zinc-700 rounded transition-colors" title="Rewind 10s"><mat-icon>replay_10</mat-icon></button>
                <button (click)="togglePlay()" class="p-2 hover:bg-zinc-700 rounded transition-colors" title="Play/Pause">
                  <mat-icon>{{ isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
                </button>
                <button (click)="skip(10)" class="p-2 hover:bg-zinc-700 rounded transition-colors" title="Forward 10s"><mat-icon>forward_10</mat-icon></button>
                
                <div class="text-xs text-zinc-400 font-mono ml-2">
                  {{ formatTime(currentTime()) }} / {{ formatTime(duration()) }}
                </div>

                <div class="flex items-center gap-2 ml-auto">
                  <button (click)="toggleMute()" class="p-2 hover:bg-zinc-700 rounded transition-colors hidden sm:block" title="Mute/Unmute">
                    <mat-icon>{{ isMuted() ? 'volume_off' : 'volume_up' }}</mat-icon>
                  </button>
                  <input type="range" min="0" max="1" step="0.05" [value]="volume()" (input)="setVolume($event)" class="w-16 sm:w-24 accent-indigo-500 hidden sm:block">
                </div>

                <div class="flex items-center gap-2 ml-2 sm:ml-4">
                  <mat-icon class="text-zinc-400 text-sm hidden sm:block">speed</mat-icon>
                  <select [ngModel]="playbackRate()" (ngModelChange)="setPlaybackRate($event)" class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option [value]="0.5">0.5x</option>
                    <option [value]="1">1x</option>
                    <option [value]="1.25">1.25x</option>
                    <option [value]="1.5">1.5x</option>
                    <option [value]="2">2x</option>
                  </select>
                </div>

                <div class="flex items-center gap-2 ml-2 sm:ml-4">
                  @if (mediaFiles().length > 1) {
                    <mat-icon class="text-zinc-400 text-sm hidden sm:block">high_quality</mat-icon>
                    <select [ngModel]="currentQuality()" (ngModelChange)="setQuality($event)" class="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[80px] sm:max-w-none truncate">
                      @for (file of mediaFiles(); track file.url) {
                        <option [value]="file.format">{{ file.format }}</option>
                      }
                    </select>
                  }
                  <button (click)="toggleFullscreen()" class="p-2 hover:bg-zinc-700 rounded transition-colors ml-1 sm:ml-2" title="Fullscreen">
                    <mat-icon>fullscreen</mat-icon>
                  </button>
                  <button (click)="toggleFocus()" class="p-2 hover:bg-zinc-700 rounded transition-colors ml-1" [title]="isFocused() ? 'Exit Focus' : 'Enter Focus'">
                    <mat-icon>{{ isFocused() ? 'fullscreen_exit' : 'crop_free' }}</mat-icon>
                  </button>
                  <button (click)="closeMedia()" class="p-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors ml-1" title="Close Media">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 sm:p-6" [class.hidden]="isFocused()">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded uppercase tracking-wider">
                  {{ currentFilm()?.mediatype }}
                </span>
                <h2 class="text-lg sm:text-xl font-bold text-white line-clamp-1">{{ currentFilm()?.title }}</h2>
              </div>
              <p class="text-zinc-400 text-sm line-clamp-2 sm:line-clamp-3">{{ currentFilm()?.description }}</p>
            </div>
          </div>
        }

        @if (videoResults().length > 0) {
          <div class="space-y-4" [class.hidden]="isFocused()">
            <h3 class="text-lg font-semibold text-zinc-300">Films</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              @for (film of videoResults(); track film.identifier) {
                <div 
                  (click)="selectFilm(film)"
                  (keydown.enter)="selectFilm(film)"
                  tabindex="0"
                  class="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-colors group focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-hidden"
                  [class.border-indigo-500]="currentFilm()?.identifier === film.identifier"
                >
                  <h4 class="font-medium text-white group-hover:text-indigo-400 transition-colors line-clamp-1 break-words">{{ film.title }}</h4>
                  <div class="flex justify-between items-center mt-1">
                    <p class="text-sm text-zinc-500">{{ film.downloads }} downloads</p>
                    @if (film.item_size) {
                      <p class="text-xs text-zinc-600">{{ formatSize(film.item_size) }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (hasSearched() && !isSearching() && searchResults().length === 0) {
          <div class="text-center py-12 text-zinc-500" [class.hidden]="isFocused()">
            No results found matching your search.
          </div>
        }
      </div>
    </div>
  `
})
export class App implements OnInit {
  searchQuery = signal('');
  searchResults = signal<FilmResult[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);
  error = signal<string | null>(null);
  
  videoResults = computed(() => this.searchResults().filter(f => f.mediatype === 'movies'));
  audioResults = computed(() => []); // Audio is disabled

  currentFilm = signal<FilmResult | null>(null);
  videoUrl = signal<string | null>(null);
  isLoadingVideo = signal(false);
  
  mediaFiles = signal<MediaFile[]>([]);
  currentQuality = signal<string | null>(null);

  volume = signal(1);
  isMuted = signal(false);
  playbackRate = signal(1);
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  progressPercentage = computed(() => {
    if (this.duration() === 0) return 0;
    return (this.currentTime() / this.duration()) * 100;
  });
  isFocused = signal(false);
  isFullscreen = signal(false);

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  constructor() {
    // Load from local storage
    if (typeof localStorage !== 'undefined') {
      const savedState = localStorage.getItem('archiveFilmState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.searchQuery) this.searchQuery.set(state.searchQuery);
          if (state.searchResults) this.searchResults.set(state.searchResults);
          if (state.currentFilm) {
            this.currentFilm.set(state.currentFilm);
            if (state.videoUrl) this.videoUrl.set(state.videoUrl);
          }
        } catch (e) {
          console.error('Failed to parse saved state', e);
        }
      }
    }

    // Save to local storage on changes
    effect(() => {
      if (typeof localStorage === 'undefined') return;
      const state = {
        searchQuery: this.searchQuery(),
        searchResults: this.searchResults(),
        currentFilm: this.currentFilm(),
        videoUrl: this.videoUrl()
      };
      localStorage.setItem('archiveFilmState', JSON.stringify(state));
    });
  }

  ngOnInit() {
    this.initOkDoc();
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', () => {
        this.isFullscreen.set(!!document.fullscreenElement);
      });
      document.addEventListener('webkitfullscreenchange', () => {
        this.isFullscreen.set(!!(document as any).webkitFullscreenElement);
      });
    }
  }

  initOkDoc() {
    if (typeof OkDoc === 'undefined') {
      console.warn('OkDoc SDK not found');
      return;
    }

    OkDoc.init({
      id: 'archive-film-player',
      name: 'Archive Film Player',
      namespace: 'archive_film',
      version: '1.0.0',
      description: 'Search and play classic feature films and audios from the Web Archive',
      icon: 'film-outline',
      mode: 'foreground',
      author: { name: 'AI Builder', url: 'https://example.com' },
    });

    OkDoc.registerTool('search_films', {
      description: 'Search for feature films in the Web Archive',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., matrix, night)' }
        },
        required: ['query']
      },
      handler: async (args: Record<string, unknown>) => {
        this.searchQuery.set(String(args['query']));
        await this.searchFilms();
        
        const results = this.searchResults();
        if (results.length === 0) {
          return { content: [{ type: 'text', text: 'No results found.' }] };
        }
        
        const list = results.slice(0, 20).map((f, i) => `${i + 1}. ${f.title} (ID: ${f.identifier}, Size: ${this.formatSize(f.item_size || 0)})`).join('\n');
        return { content: [{ type: 'text', text: `Found ${results.length} results:\n${list}` }] };
      }
    });

    OkDoc.registerTool('select_film', {
      description: 'Select a film to play by its identifier',
      inputSchema: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'The identifier of the film from search results' }
        },
        required: ['identifier']
      },
      handler: async (args: Record<string, unknown>) => {
        const identifier = String(args['identifier']);
        const film = this.searchResults().find(f => f.identifier === identifier);
        
        if (!film) {
          // If not in current results, try to fetch it directly or just use the identifier
          await this.selectFilmByIdentifier(identifier);
        } else {
          await this.selectFilm(film);
        }
        
        return { content: [{ type: 'text', text: `Selected item: ${identifier}. Fetching media URL...` }] };
      }
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
      }
    });

    OkDoc.registerTool('pause_video', {
      description: 'Pause the currently playing media',
      handler: async () => {
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.pause();
          return { content: [{ type: 'text', text: 'Playback paused.' }] };
        }
        return { content: [{ type: 'text', text: 'No media loaded to pause.' }] };
      }
    });

    OkDoc.registerTool('skip_media', {
      description: 'Skip forward or backward in the media',
      inputSchema: {
        type: 'object',
        properties: {
          seconds: { type: 'number', description: 'Seconds to skip (positive for forward, negative for backward)' }
        },
        required: ['seconds']
      },
      handler: async (args: Record<string, unknown>) => {
        const seconds = Number(args['seconds']);
        this.skip(seconds);
        return { content: [{ type: 'text', text: `Skipped ${seconds > 0 ? 'forward' : 'backward'} by ${Math.abs(seconds)} seconds.` }] };
      }
    });

    OkDoc.registerTool('set_volume', {
      description: 'Set the playback volume',
      inputSchema: {
        type: 'object',
        properties: {
          level: { type: 'number', description: 'Volume level from 0.0 to 1.0' }
        },
        required: ['level']
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
      }
    });

    OkDoc.registerTool('toggle_mute', {
      description: 'Toggle mute on or off',
      handler: async () => {
        this.toggleMute();
        return { content: [{ type: 'text', text: `Media is now ${this.isMuted() ? 'muted' : 'unmuted'}.` }] };
      }
    });

    OkDoc.registerTool('set_playback_rate', {
      description: 'Set the playback speed/rate',
      inputSchema: {
        type: 'object',
        properties: {
          rate: { type: 'number', description: 'Playback rate (e.g., 0.5, 1, 1.25, 1.5, 2)' }
        },
        required: ['rate']
      },
      handler: async (args: Record<string, unknown>) => {
        const rate = Number(args['rate']);
        this.setPlaybackRate(rate);
        return { content: [{ type: 'text', text: `Playback rate set to ${rate}x.` }] };
      }
    });

    OkDoc.registerTool('set_quality', {
      description: 'Set the media quality/format',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', description: 'Format string (e.g., "512Kbps MP4", "VBR MP3")' }
        },
        required: ['format']
      },
      handler: async (args: Record<string, unknown>) => {
        const format = String(args['format']);
        this.setQuality(format);
        return { content: [{ type: 'text', text: `Requested quality change to ${format}.` }] };
      }
    });

    OkDoc.registerTool('clear_search', {
      description: 'Clear the current search results and query',
      handler: async () => {
        this.clearSearch();
        return { content: [{ type: 'text', text: 'Search results cleared.' }] };
      }
    });

    OkDoc.registerTool('close_media', {
      description: 'Close the currently playing media',
      handler: async () => {
        this.closeMedia();
        return { content: [{ type: 'text', text: 'Media closed.' }] };
      }
    });

    OkDoc.registerTool('toggle_focus', {
      description: 'Toggle focus mode (hides everything except the video player)',
      handler: async () => {
        this.toggleFocus();
        return { content: [{ type: 'text', text: `Focus mode is now ${this.isFocused() ? 'ON' : 'OFF'}.` }] };
      }
    });

    OkDoc.registerTool('toggle_fullscreen', {
      description: 'Toggle fullscreen mode for the video player',
      handler: async () => {
        this.toggleFullscreen();
        return { content: [{ type: 'text', text: 'Toggled fullscreen.' }] };
      }
    });
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.error.set(null);
  }

  closeMedia() {
    this.currentFilm.set(null);
    this.videoUrl.set(null);
    this.mediaFiles.set([]);
    this.currentQuality.set(null);
    this.isPlaying.set(false);
    this.isFocused.set(false);
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async searchFilms() {
    const query = this.searchQuery().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.error.set(null);
    this.hasSearched.set(true);

    try {
      // Exclude audios, trailers, samples, and short clips. Require item_size to filter out empty items.
      const url = `https://archive.org/advancedsearch.php?q=(mediatype:movies)+AND+title:(${encodeURIComponent(query)})+AND+NOT+title:(trailer OR sample OR clip OR promo)+AND+item_size:[10000000 TO *]&fl[]=identifier,title,description,downloads,mediatype,item_size&sort[]=item_size+desc&rows=20&page=1&output=json`;
      const response = await fetch(url);
      const data = await response.json();
      
      let docs = data.response?.docs || [];
      // Sort by size descending
      docs.sort((a: any, b: any) => (b.item_size || 0) - (a.item_size || 0));
      
      this.searchResults.set(docs);
    } catch (err) {
      console.error('Search error:', err);
      this.error.set('Failed to search. Please try again.');
      this.searchResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  async selectFilm(film: FilmResult) {
    this.currentFilm.set(film);
    this.isFocused.set(true);
    await this.fetchMediaUrl(film.identifier);
  }

  async selectFilmByIdentifier(identifier: string) {
    this.currentFilm.set({ identifier, title: identifier, description: '', downloads: 0, mediatype: 'unknown' });
    this.isFocused.set(true);
    await this.fetchMediaUrl(identifier);
  }

  async fetchMediaUrl(identifier: string) {
    this.isLoadingVideo.set(true);
    this.error.set(null);
    this.videoUrl.set(null);
    this.mediaFiles.set([]);
    this.currentQuality.set(null);

    try {
      const url = `https://archive.org/metadata/${identifier}`;
      const response = await fetch(url);
      const data = await response.json();

      const files = data.files || [];
      const isAudio = this.currentFilm()?.mediatype === 'audio';
      
      let validFiles: MediaFile[] = [];
      
      if (isAudio) {
        validFiles = files
          .filter((f: Record<string, unknown>) => String(f['name']).endsWith('.mp3') || String(f['format']).includes('MP3'))
          .map((f: Record<string, unknown>) => ({
            name: String(f['name']),
            format: String(f['format']),
            size: String(f['size']),
            url: `https://archive.org/download/${identifier}/${f['name']}`
          }));
      } else {
        validFiles = files
          .filter((f: Record<string, unknown>) => String(f['name']).endsWith('.mp4') || String(f['format']).includes('MPEG4'))
          .map((f: Record<string, unknown>) => ({
            name: String(f['name']),
            format: String(f['format']),
            size: String(f['size']),
            url: `https://archive.org/download/${identifier}/${f['name']}`
          }));
      }

      if (validFiles.length > 0) {
        this.mediaFiles.set(validFiles);
        this.videoUrl.set(validFiles[0].url);
        this.currentQuality.set(validFiles[0].format);
      } else {
        this.error.set(`Could not find an ${isAudio ? 'MP3' : 'MP4'} link for this item.`);
      }
    } catch (err) {
      console.error('Fetch media error:', err);
      this.error.set('Failed to fetch media details.');
    } finally {
      this.isLoadingVideo.set(false);
    }
  }

  skip(seconds: number) {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime += seconds;
    }
  }

  togglePlay() {
    if (this.videoPlayer?.nativeElement) {
      if (this.videoPlayer.nativeElement.paused) {
        this.videoPlayer.nativeElement.play().catch(e => console.warn('Play error:', e));
      } else {
        this.videoPlayer.nativeElement.pause();
      }
    }
  }

  toggleMute() {
    if (this.videoPlayer?.nativeElement) {
      const muted = !this.isMuted();
      this.videoPlayer.nativeElement.muted = muted;
      this.isMuted.set(muted);
    }
  }

  setVolume(event: Event) {
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

  setPlaybackRate(rate: number) {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.playbackRate = rate;
      this.playbackRate.set(rate);
    }
  }

  setQuality(format: string) {
    const file = this.mediaFiles().find(f => f.format === format);
    if (file && this.videoPlayer?.nativeElement) {
      const currentTime = this.videoPlayer.nativeElement.currentTime;
      const isPaused = this.videoPlayer.nativeElement.paused;
      
      this.videoUrl.set(file.url);
      this.currentQuality.set(format);
      
      setTimeout(() => {
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.currentTime = currentTime;
          if (!isPaused) {
            this.videoPlayer.nativeElement.play().catch(e => console.warn('Play error:', e));
          }
        }
      }, 100);
    }
  }

  onPlay() {
    this.isPlaying.set(true);
    if (typeof OkDoc !== 'undefined') {
      OkDoc.notify('Player state changed: Playing');
    }
  }

  onPause() {
    this.isPlaying.set(false);
    if (typeof OkDoc !== 'undefined') {
      OkDoc.notify('Player state changed: Paused');
    }
  }

  onVideoLoaded() {
    this.isLoadingVideo.set(false);
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.volume = this.volume();
      this.videoPlayer.nativeElement.muted = this.isMuted();
      this.videoPlayer.nativeElement.playbackRate = this.playbackRate();
      this.duration.set(this.videoPlayer.nativeElement.duration || 0);
    }
  }

  onTimeUpdate() {
    if (this.videoPlayer?.nativeElement) {
      this.currentTime.set(this.videoPlayer.nativeElement.currentTime);
    }
  }

  seekTo(event: MouseEvent) {
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
    if (!seconds || isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  toggleFocus() {
    this.isFocused.update(f => !f);
  }

  toggleFullscreen() {
    if (!this.videoPlayer?.nativeElement) return;
    
    const elem = this.videoPlayer.nativeElement;
    
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) { /* Safari */
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) { /* IE11 */
        (elem as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) { /* Safari */
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) { /* IE11 */
        (document as any).msExitFullscreen();
      }
    }
  }

  onVideoError(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (video.error && video.error.code === 1) {
      // MEDIA_ERR_ABORTED - usually happens when changing src, ignore
      return;
    }
    this.isLoadingVideo.set(false);
    this.error.set('Error loading media playback.');
  }
}

