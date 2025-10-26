# Fixes: MO3 visibility + Add-only GraphsEditor

This package contains two drop-in updates:

1) **src/components/BottomBar.tsx**
   - Fixes the filter so **MO3** shows correctly.
   - Uses a robust map to match `AO5`, `AO12`, etc. to `dataShown.ao5`, `dataShown.ao12`, ...
   - Keeps drag-and-drop for stats and graph remount keys for height changes.

2) **src/components/SettingsModal.GraphsEditor.tsx**
   - Use this component to replace your current GraphsEditor implementation in SettingsModal.
   - At the top there is **only “+ Add graph”** (no remove button).
   - Each graph row has an **×** button to remove that graph.
   - Drag to reorder graphs (drop before/after by hovering left/right half).

## How to apply

- Replace `src/components/BottomBar.tsx` with the file in this zip **or** merge the `items` filter block shown here:

```ts
const items = baseOrder.filter(k => {
  if (k === 'BEST') return true
  if (k === 'MO3') return !!showMap.mo3
  const m = /^AO(\d+)$/.exec(k)
  if (m) {
    const key = ('ao' + m[1]) as keyof typeof showMap
    return !!showMap[key]
  }
  return false
})
```

- In `src/components/SettingsModal.tsx`, either **copy the GraphsEditor code** from
  `src/components/SettingsModal.GraphsEditor.tsx` into your file or **import** and use it directly.
  Make sure the **top controls row** contains **only** the “+ Add graph” button so the legacy
  “Remove graph” button disappears.

> If you render graphs in other places (e.g. Timer display), ensure their `key` also changes with height/last/half to force a remount on size/layout changes.
