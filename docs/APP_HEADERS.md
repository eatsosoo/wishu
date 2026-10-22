# Shared subpage headers

Give subpages an `AppScreen` header instead of placing navigation buttons or titles in scrolling content:

```tsx
<AppScreen header={{ title: 'Chi tiết điều ước', onBack: goBack, right: menuButton }}>
  {/* Scrolling content */}
</AppScreen>
```

`AppScreen` renders the shared `AppHeader` inside the top safe area, outside its ScrollView. It stays visible on native and web without absolute overlays or per-screen sticky positioning. `onBack` is optional and defaults to router history with a home fallback; `backLabel` customizes the accessibility label. Keep screen-specific navigation and right-hand actions in these props.

Shared metrics live in `src/components/AppScreen.tsx`: height 64, horizontal padding 24, action slots 44, gaps 8, title font size 20 and line height 34. Symmetric action slots center the title even when the right side is empty. Titles use one line with tail truncation. Background/border follow the app theme; scroll content begins below the header.

Wish detail, completion, preparation, new wish, notifications, avatar, gift, memory detail/day and check-in screens use this API, including their empty/loading states where applicable. Back controls previously positioned over hero images were removed. Main-page headings use `ScreenTitle`.

`tests/check-in-browser.cjs` checks 11 subpage routes: shared height, visible back button and stable header bounds after scrolling. It also verifies that a long wish form really scrolls below its header. Physical iOS/Android QA should cover safe-area insets and keyboard navigation.

The full-screen photo crop modal also uses `AppHeader`, with a close action instead of back navigation. A modal-local `SafeAreaProvider` measures the native modal window so its header clears the iOS status bar; keep it outside `PopupLayer` and `SafeAreaView`.
