---
trigger: always_on
---

# Frontend Architecture Guidelines PART 1

## Ionic/Angular Best Practices for app

> **Purpose**: This document defines the architectural rules, patterns, and conventions for the app frontend. Following these guidelines ensures consistency, maintainability, scalability, and mobile-first design.

---

## 1. Project Structure

### 1.1. Folder Organization
```
src/
├── common-styles.scss       # App-specific reusable styles (app-* prefix)
├── util-styles.scss         # Generic atomic utilities (ut-* prefix)
├── global.scss              # Global imports (Ionic + custom styles)
└── app/
    ├── apis/                # Pure HTTP API wrappers (no business logic)
    ├── services/            # Business logic services (providedIn: 'root')
    │   ├── socket.ts
    │   ├── user.ts
    │   ├── toast.ts
    │   └── recent-rooms.ts
    ├── pages/               # Routed page components
    │   ├── home/
    │   │   ├── home.page.ts
    │   │   ├── home.page.html
    │   │   └── home.page.scss
    │   └── room/
    ├── components/          # Feature-specific components
    │   ├── player/
    │   ├── search/
    │   └── playlist/
    ├── shared/              # Reusable UI components (NO business logic)
    │   ├── components/
    │   ├── pipes/
    │   └── directives/
    └── app.component.ts
```

### 1.2. Module Organization
| Folder | Purpose | Import Rule |
|--------|---------|-------------|
| `apis/` | Pure HTTP API wrappers - no business logic | Import only in services, not components |
| `services/` | Business logic services (`providedIn: 'root'`) | Auto-injected, used in components |
| `shared/` | Reusable UI components with **no business logic** | Import in any feature module |
| `components/` | Feature components tied to specific functionality | Import where needed |

### 1.3. APIs vs Services Separation
**APIs Folder** (`apis/`): Contains pure HTTP wrappers that:
- Only make HTTP calls (GET, POST, DELETE, PATCH)
- Return Observables directly
- Do NOT show toasts or handle UI feedback
- Do NOT contain business logic
- File naming: `*.api.service.ts`

**Services Folder** (`services/`): Contains business logic services that:
- Wrap API services and add business logic
- Show toasts on success/error
- Handle state management (BehaviorSubjects)
- May call multiple APIs
- File naming: `*.service.ts` or just `*.ts`

```typescript
// ❌ BAD: Business logic in component
this.favoritesApi.addFavorite(video).subscribe({
  next: (res) => this.toastService.success('Added!'),
  error: () => this.toastService.error('Failed!')
});

// ✅ GOOD: Component calls service with business logic
this.favoritesService.addFavorite(video); // Service handles toast internally
```

### 1.4. Service Usage Guidelines
**Before implementing any functionality**, check if a service already exists.

**Rules**:
- **Do NOT** duplicate logic across components—extract to services
- **Do NOT** manage localStorage directly in components—use appropriate service
- **Do NOT** create ad-hoc toast/alert methods—use `ToastService`
- **DO** inject services via constructor (private, not public unless needed in template)
- **DO** create new services for reusable functionality in `services/` folder

```typescript
// ❌ BAD: Duplicate localStorage logic in component
localStorage.setItem('recent_rooms', JSON.stringify(rooms));

// ✅ GOOD: Use dedicated service
this.recentRoomsService.saveRoom(roomId, role);
```


---

## 2. Component Design Patterns

### 2.0. Project-Specific Angular Configuration
This project uses **specific Angular configuration** that differs from Angular defaults:

```typescript
// ✅ All components must use standalone: true
@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  standalone: true,  // Required for this project
  imports: [CommonModule, IonicModule]  // Import dependencies directly
})
```

**Do NOT use Angular Signals** in this project:
```typescript
// ❌ BAD: Angular Signals (not used in this project)
count = signal(0);
doubled = computed(() => this.count() * 2);

// ✅ GOOD: Traditional properties and methods
count = 0;
get doubled(): number { return this.count * 2; }
```

### 2.1. Single Responsibility Principle
- Each component should have **one clear purpose**.
- If a component exceeds ~200 lines of TypeScript, consider splitting it.
- Avoid "god components" that handle multiple unrelated features.

### 2.2. Smart vs. Presentational Components
| Type | Responsibility | Example |
|------|----------------|---------|
| **Smart (Container)** | Data fetching, state management, business logic | `RoomPage` |
| **Presentational (Dumb)** | Pure UI rendering, receives data via `@Input()`, emits via `@Output()` | `PlayerComponent` |

**Rule**: Presentational components should NOT inject services. They receive data and emit events only.

### 2.3. No Business Logic in Templates
```html
<!-- ❌ BAD: Logic in template -->
<ion-button (click)="socketService.emit('vote', {videoId: item.id})">Vote</ion-button>

<!-- ✅ GOOD: Delegate to component method -->
<ion-button (click)="voteVideo(item)">Vote</ion-button>
```

```typescript
// Component class
voteVideo(item: any) {
  this.socketService.emit('vote', { videoId: item.id });
}
```

### 2.4. Services Must Be Private
```typescript
// ❌ BAD: Public service exposed to template
constructor(public socketService: SocketService) {}

// ✅ GOOD: Private service, methods exposed
constructor(private socketService: SocketService) {}
```

### 2.5. Class Property Ordering (Angular Official)
Group Angular-specific properties together, near the **top** of the class, before methods:

```typescript
export class RoomPage implements OnInit, OnDestroy {
  // 1. Angular decorators/properties first
  @Input() roomId: string = '';
  @Output() readonly roomClosed = new EventEmitter<void>();

  // 2. Injected services (via constructor or inject())
  private socketService = inject(SocketService);

  // 3. Component state properties
  currentVideo: Video | null = null;
  isPlaying = false;

  // 4. Computed/derived properties
  protected get hasQueue(): boolean {
    return this.queueList.length > 0;
  }

  // 5. Lifecycle methods
  ngOnInit(): void { ... }
  ngOnDestroy(): void { ... }

  // 6. Public methods
  playVideo(): void { ... }

  // 7. Private methods
  private loadRoom(): void { ... }
}
```

### 2.6. Use `protected` for Template-Only Members
```typescript
// Members used ONLY in templates (not public API) should be protected
protected fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
```

### 2.7. Use `readonly` for Outputs and Queries
```typescript
// Outputs should not be reassigned
@Output() readonly videoSelected = new EventEmitter<Video>();

// ViewChild/ViewChildren should be readonly
@ViewChildren(PlaylistItem) readonly playlistItems?: QueryList<PlaylistItem>;
```

---

## 3. TypeScript Coding Standards

### 3.1. Always Use Block Statements
```typescript
// ❌ BAD: Single-line if
if (error) return;

// ✅ GOOD: Block statement
if (error) {
  return;
}
```

### 3.2. Explicit Types Everywhere
All types must be explicit—do not rely on TypeScript inference for return types or object literals.

```typescript
// ❌ BAD: Implicit parameter type
onVideoSelected(video) { ... }

// ✅ GOOD: Explicit parameter type
onVideoSelected(video: Video): void { ... }

// ❌ BAD: Implicit return object (even with return type declared)
getConfig(): RoomConfig {
  return { autoApprove: true, threshold: 3 }; // Implicitly typed!
}

// ✅ GOOD: Explicit object type assertion
getConfig(): RoomConfig {
  return { autoApprove: true, threshold: 3 } as RoomConfig;
}

// ✅ ALSO GOOD: Assign to typed variable first
getConfig(): RoomConfig {
  const config: RoomConfig = { autoApprove: true, threshold: 3 };
  return config;
}

// ❌ BAD: Untyped callback response
this.socket.emit('action', data, (res) => { ... });

// ✅ GOOD: Typed callback
this.socket.emit('action', data, (res: ActionResponse) => { ... });

// ✅ GOOD: Define interface
interface VideoInfo {
  title: string;
  id: string;
  duration: number;
}

function getVideoInfo(): VideoInfo {
  return { title: 'Song', id: '123', duration: 180 };
}
```

**Rules:**
- **All function parameters** must have explicit types
- **All function return types** must be declared (`:void`, `:Promise<T>`, etc.)
- **Object literals** returned from functions must use `as Type` or be assigned to typed variables
- **Callback parameters** (especially from socket/HTTP responses) must be typed

### 3.3. Use Interfaces for Data Models
```typescript
// Define in models/ folder
export interface Video {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  votes: number;
}
```

### 3.4. Avoid Magic Numbers and Strings
```typescript
// ❌ BAD: Magic number
setTimeout(() => {}, 500);

// ✅ GOOD: Named constant
const DEBOUNCE_MS = 500;
setTimeout(() => {}, DEBOUNCE_MS);
```

### 3.5. Prefer async/await Over Callbacks
```typescript
// ❌ BAD: Callback hell
this.userService.getUser((user) => {
  this.roomService.getRoom(user.roomId, (room) => {
    this.playlistService.getPlaylist(room.id, (playlist) => {
      this.playlist = playlist;
    });
  });
});

// ✅ GOOD: async/await for readability
async loadData() {
  try {
    const user = await this.userService.getUser();
    const room = await this.roomService.getRoom(user.roomId);
    this.playlist = await this.playlistService.getPlaylist(room.id);
  } catch (error) {
    this.showErrorAlert('Failed to load data');
  }
}
```

---

## 4. Styling Guidelines

### 4.1. Core Principles (Utility-First CSS)
**This project follows a "Utility-First" (Atomic CSS) approach.**
Instead of writing custom CSS classes for every component, use generic utility classes to compose your UI directly in the HTML.

**Priority order for styling:**
1. **Ionic utility classes** (`ion-padding`, `ion-margin-top`, `ion-text-center`, etc.)
2. **App utility classes** (`ut-flex`, `ut-p-16`, `ut-gap-8`, defined in `util-styles.scss`)
3. **App common classes** (`app-brand-header`, etc. defined in `common-styles.scss`)
4. **Component-scoped SCSS** (LAST RESORT - only for complex, non-reusable styles)

**Strict Rules:**
- **Do NOT use inline styles** in HTML templates (e.g. `style="padding: 16px"`)
- **Do NOT create custom classes** for simple layout/spacing (e.g. `.content-wrapper` { padding: 16px }) -> Use `ion-padding` or `ut-p-16` instead.
- **Do NOT duplicate styles** across component SCSS files
- **DO prefer atomic/utility classes** over custom CSS
- **DO check shared files** (`util-styles.scss` and `common-styles.scss`) before creating new classes

```html
<!-- ❌ BAD: Inline styles -->
<div style="display: flex; gap: 8px; margin-top: 16px;">

<!-- ✅ GOOD: Atomic utility classes -->
<div class="ut-flex ut-gap-8 ion-margin-top">
```

### 4.2. Global Style Files
The app uses two shared style files imported via `global.scss`:

| File | Purpose | Class Prefix | Example |
|------|---------|--------------|---------|
| `common-styles.scss` | App-specific reusable patterns | `app-*` | `app-brand-header` |
| `util-styles.scss` | Generic atomic utilities | `ut-*` | `ut-flex`, `ut-gap-8` |

**Rules**:
- **Do NOT** duplicate styles across component SCSS files—move to shared files
- **DO** use `app-` prefix for app-specific branding/UI patterns (e.g., `app-brand-header`)
- **DO** use `ut-` prefix for generic utilities (e.g., `ut-flex-center`, `ut-gap-8`)
- **DO** check shared files before creating new classes

```scss
// ❌ BAD: Duplicate style in component
.brand-header { display: flex; gap: 8px; }

// ✅ GOOD: Use shared common-styles.scss
<div class="app-brand-header">

// ❌ BAD: Inline utility style
.my-flex-container { display: flex; gap: 8px; }

// ✅ GOOD: Compose with atomic utilities or use shared util-styles.scss
<div class="ut-flex ut-gap-8">
```
