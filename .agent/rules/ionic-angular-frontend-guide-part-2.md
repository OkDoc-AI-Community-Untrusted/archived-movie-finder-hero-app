---
trigger: always_on
---

# Frontend Architecture Guidelines PART 2

### 4.3. Use Ionic Components First
**Always prefer Ionic's built-in components** over custom HTML elements:
- `<ion-button>` instead of `<button>`
- `<ion-input>` instead of `<input>`
- `<ion-list>`, `<ion-item>` for lists
- `<ion-card>` for card layouts

### 4.4. Ionic Grid & Responsive Design
```html
<ion-grid>
  <ion-row class="ion-justify-content-center">
    <ion-col size="12" size-md="6">
      <!-- Content -->
    </ion-col>
  </ion-row>
</ion-grid>
```

**Responsive Breakpoints:**
| Breakpoint | Size | Usage |
|------------|------|-------|
| (default) | < 576px | Extra small (phones) |
| `size-sm` | ≥ 576px | Small tablets |
| `size-md` | ≥ 768px | Tablets |
| `size-lg` | ≥ 992px | Desktop |
| `size-xl` | ≥ 1200px | Large desktop |

### 4.5. Ionic Utility Classes
```html
<!-- ✅ Use built-in utility classes -->
<div class="ion-padding ion-margin-top ion-text-center">
  <h1 class="ion-text-uppercase">Title</h1>
</div>
```

**Common Ionic Utilities:**
- `ion-padding`, `ion-padding-top`, `ion-padding-horizontal`
- `ion-margin`, `ion-margin-bottom`
- `ion-text-center`, `ion-text-left`, `ion-text-uppercase`
- `ion-hide-sm-down`, `ion-hide-md-up` (responsive visibility)
- `ion-justify-content-center`, `ion-align-items-center`

**Atomic-First Principle:**
- **Always prefer Ionic utility classes** (e.g., `ion-margin-top`, `ion-text-center`) over custom SCSS
- **Use `ut-*` classes** from `util-styles.scss` for gaps, flex patterns, etc.
- This keeps stylesheets minimal and improves consistency
- **Only create custom classes** when utility classes become unwieldy (e.g., 5+ classes on one element)

### 4.6. Component-Scoped Styles
- Each component should have its own `.scss` file
- Keep component SCSS focused on that component only
- **Never use global styles to override component styles**

### 4.7. Avoid Deep Nesting
```scss
// ❌ BAD: Too deep (> 3 levels)
.card {
  .header {
    .title {
      .icon { color: red; }
    }
  }
}

// ✅ GOOD: Flatten selectors
.card-header-title-icon {
  color: red;
}
```

---

## 5. Error Handling

### 5.1. Socket Callback Error Pattern
```typescript
this.socketService.emit('action', payload, (res: any) => {
  if (!res.success) {
    this.showErrorAlert(res.message || 'An error occurred');
    return;
  }
  // Handle success
});
```

### 5.2. Centralized Error Display
```typescript
// In component base or shared service
async showErrorAlert(message: string) {
  const alert = await this.alertCtrl.create({
    header: 'Error',
    message: message,
    buttons: ['OK']
  });
  await alert.present();
}

async showSuccessToast(message: string) {
  const toast = await this.toastCtrl.create({
    message: message,
    duration: 3000,
    position: 'top',
    color: 'success'
  });
  await toast.present();
}
```

### 5.3. Never Swallow Errors Silently
```typescript
// ❌ BAD: Silent fail
.subscribe(data => { /* success */ }, error => { /* nothing */ });

// ✅ GOOD: Handle and log
.subscribe({
  next: (data) => { /* success */ },
  error: (err) => {
    console.error('Operation failed:', err);
    this.showErrorAlert('Something went wrong');
  }
});
```

---

## 6. Mobile-First Design Principles

### 6.1. Design for Mobile First
- Start with the smallest screen layout, then enhance for larger screens.
- Use `size="12"` for mobile, then add `size-md="6"` for tablets.

### 6.2. Touch-Friendly UI
- **Minimum tap target**: 44x44 pixels.
- **Adequate spacing**: Use `ion-margin` between interactive elements.
- **Avoid hover-only states**: Mobile has no hover, use `ion-activatable` for touch feedback.

### 6.3. Performance Considerations
- **Lazy loading**: Load feature modules only when needed.
- **Optimize images**: Use appropriate sizes, consider lazy loading.
- **Minimize DOM depth**: Deep nesting hurts mobile rendering.

### 6.4. Safe Areas
```scss
// Respect device safe areas (notches, home indicators)
ion-content {
  --padding-top: var(--ion-safe-area-top);
  --padding-bottom: var(--ion-safe-area-bottom);
}
```

### 6.5. Ionic Page Lifecycle (Official)
Ionic provides additional lifecycle events beyond Angular's `ngOnInit`/`ngOnDestroy`:

| Event | When It Fires | Use Case |
|-------|---------------|----------|
| `ionViewWillEnter` | Before page transition starts | Load/refresh data |
| `ionViewDidEnter` | After page transition completes | Start animations, focus inputs |
| `ionViewWillLeave` | Before leaving page | Save state, unsubscribe observables |
| `ionViewDidLeave` | After leaving page | Cleanup if needed |

**Important Notes:**
- `ngOnInit` only fires **once** when the page is first created (Ionic caches pages in DOM).
- Use `ionViewWillEnter` to refresh data on every visit.
- **Don't use `OnPush` change detection** with `ion-router-outlet` – it breaks lifecycle hooks.

```typescript
export class RoomPage implements OnInit, OnDestroy {
  ngOnInit() {
    // One-time setup (subscriptions, initial state)
  }

  ionViewWillEnter() {
    // Runs EVERY time page becomes visible - refresh data here
    this.loadLatestData();
  }

  ionViewWillLeave() {
    // Cleanup before leaving - unsubscribe if needed
  }

  ngOnDestroy() {
    // Final cleanup when page is destroyed (popped from stack)
  }
}
```

---

## 7. Naming Conventions

### 7.1. Files
| Type | Pattern | Example |
|------|---------|---------|
| Component | `feature-name.component.ts` | `player.component.ts` |
| Page | `page-name.page.ts` | `room.page.ts` |
| Service | `feature-name.service.ts` | `socket.service.ts` |
| Interface | `model-name.interface.ts` | `video.interface.ts` |
| Pipe | `pipe-name.pipe.ts` | `format-time.pipe.ts` |

### 7.2. Classes
| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase + suffix | `PlayerComponent` |
| Service | PascalCase + suffix | `SocketService` |
| Interface | PascalCase (no prefix) | `Video`, `RoomConfig` |

### 7.3. Variables & Methods
- **Variables**: `camelCase` → `currentVideo`, `isPlaying`
- **Methods**: `camelCase` verb → `playVideo()`, `fetchPlaylist()`
- **Boolean variables**: Use `is`, `has`, `can` prefix → `isHost`, `hasVoted`
- **Event handlers**: Use `on` prefix → `onVideoEnded()`, `onSubmit()`
- **Output events**: Use past tense → `videoSelected`, `suggestionMade`

---

## 8. Things to Avoid (Anti-Patterns)

### 8.1. No Hacks or Workarounds
- If something "needs a hack," it's a design problem. Refactor properly.
- No `!important` in SCSS unless absolutely unavoidable (document why).
- No `setTimeout` to "fix" timing issues (use proper lifecycle hooks or RxJS).

### 8.2. No Direct DOM Manipulation
```typescript
// ❌ BAD: Direct DOM access
document.getElementById('player').style.display = 'none';

// ✅ GOOD: Use Angular bindings
<div [hidden]="!showPlayer">...</div>
```

### 8.3. No Empty Callbacks
```typescript
// ❌ BAD: Empty callback
.subscribe(() => {});

// ✅ GOOD: Either handle or remove subscription
.pipe(take(1)).subscribe();
```

---

## 9. Code Quality Checklist

Before committing, verify:

- [ ] No TypeScript errors or warnings
- [ ] No `console.log` statements (use proper logging if needed)
- [ ] No commented-out code
- [ ] All services are private in constructors
- [ ] All conditionals use block statements `{ }`
- [ ] No business logic in HTML templates
- [ ] Ionic components used wherever available
- [ ] Responsive design tested on mobile viewport
- [ ] Error handling in place for all async operations
- [ ] Meaningful variable and method names

---

## 10. Software Engineering Principles

### 10.1. DRY (Don't Repeat Yourself)
Every piece of logic should have a **single, authoritative representation**.

```typescript
// ❌ BAD: Duplicated validation logic
if (user.role === 'host' || user.role === 'admin') { ... }
// ... later in another file
if (user.role === 'host' || user.role === 'admin') { ... }

// ✅ GOOD: Centralized function
isAuthorized(user: User): boolean {
  return user.role === 'host' || user.role === 'admin';
}
```

**Apply DRY to:**
- Validation logic
- API endpoint URLs
- Common UI patterns (extract to shared components)
- Error messages

### 10.2. KISS (Keep It Simple, Stupid)
Favor simple solutions over clever ones. Code is read more often than written.

```typescript
// ❌ BAD: Overly clever one-liner
const result = items.reduce((a, b) => ({ ...a, [b.id]: b }), {});

// ✅ GOOD: Clear and readable
const result: Record<string, Item> = {};
for (const item of items) {
  result[item.id] = item;
}
```

### 10.3. No Hardcoded Values
All configurable values should be defined as constants or configuration.

```typescript
// ❌ BAD: Hardcoded values scattered in code
if (items.length > 50) { ... }
const url = 'http://localhost:3000/api';
setTimeout(() => {}, 500);

// ✅ GOOD: Named constants in dedicated file
// constants.ts
export const MAX_PLAYLIST_ITEMS = 50;
export const API_BASE_URL = 'http://localhost:3000/api';
export const SEARCH_DEBOUNCE_MS = 500;

// usage
import { MAX_PLAYLIST_ITEMS, SEARCH_DEBOUNCE_MS } from './constants';
if (items.length > MAX_PLAYLIST_ITEMS) { ... }
```

**What to extract:**
- API URLs and endpoints
- Timeout/delay values
- Size limits and thresholds
- Error message strings
- Socket event names

### 10.4. Single Source of Truth
Each piece of data should live in **one place only**.

```typescript
// ❌ BAD: Same data stored in multiple places
this.roomId = room.id;
this.roomName = room.name;
this.currentRoom = room;

// ✅ GOOD: Store once, access properties when needed
this.currentRoom = room;
// Use this.currentRoom.id, this.currentRoom.name
```

### 10.5. Meaningful Names
Names should reveal intent without needing comments.

```typescript
// ❌ BAD: Vague or abbreviated names
const d = new Date();
const arr = [];
function proc(v) { ... }

// ✅ GOOD: Descriptive names
const currentDate = new Date();
const pendingVideos: Video[] = [];
function processVideoSuggestion(video: Video): void { ... }
```

### 10.6. Comments: When and How
```typescript
// ❌ BAD: Comment stating the obvious
// Increment counter by 1
counter++;

// ❌ BAD: Commented-out code (delete it, use version control)
// this.oldMethod();

// ✅ GOOD: Explain WHY, not WHAT
// Skip the first item because it's the currently playing video
const upNext = queue.slice(1);

// ✅ GOOD: Document non-obvious behavior
// Ionic caches pages, so we refresh data on every view enter
ionViewWillEnter() { ... }
```

### 10.7. Fail Fast and Loud
Handle edge cases early and explicitly.

```typescript
// ✅ GOOD: Guard clause at the start
playVideo(video: Video | null): void {
  if (!video) {
    console.warn('playVideo called with null video');
    return;
  }
  // Main logic here
}
```

### 10.8. Separation of Concerns
Each module/class/function should handle **one thing**.

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Component** | UI rendering and user interaction | `RoomPage` |
| **Service** | Business logic and data operations | `SocketService` |
| **Model** | Data structure definitions | `Video` interface |
| **Utility** | Pure helper functions | `formatDuration()` |

---

## 11. Quick Reference Card

| Category | Rule | Section |
|----------|------|------|
| **Types** | All explicit (params, returns, callbacks, object literals) | 3.2 |
| **Services** | Private in constructor, methods exposed | 2.4 |
| **Templates** | No direct service access, no inline styles | 2.3, 4.1 |
| **Styles** | Ionic utilities → ut-* → app-* → component SCSS | 4.1 |
| **Conditionals** | Always use `{ }` blocks | 3.1 |
| **Components** | Single responsibility, < 200 lines | 2.1 |
| **Errors** | Never swallowed, always displayed to user | 5.3 |
| **Callbacks** | Always handle success & error cases | 5.1 |
| **Naming** | `camelCase` methods, `PascalCase` classes | 7 |
| **Mobile** | Touch targets ≥ 44px, test on mobile viewport | 6.2 |

**Last Updated**: 07/01/2026, Juke