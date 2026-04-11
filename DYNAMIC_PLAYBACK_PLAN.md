# Task: Implement Dynamic Playback Resolution (Snapshot Budgeting)

## Problem Statement
The current playback system uses a fixed 5-minute data resolution for all time ranges. This leads to several major issues:
1. **Lack of Granularity**: For short time ranges (e.g., 1-2 hours), the user cannot see high-fidelity data, even though the database contains 1-minute resolution data.
2. **Performance Risk**: While 24 hours at 5-minute intervals (~288 snapshots) is currently stable, there is no hard cap on snapshots, which could lead to Out-Of-Memory (OOM) errors or UI lag if users select much larger ranges with higher resolutions.
3. **Inflexible Time Selection**: The current UI is designed as a "Time Viewer" rather than a "Range Selector." The date and time pickers only allow for selecting a single starting timestamp, making it impossible for users to intuitively define a custom temporal window (start and end time) directly in the playback controls. They are also architected as separate pickers currently, so the user has to select date first and then time to view the specific range they want, which causes the playback to load twice.

## Objective
Implement a "Dynamic Level of Detail" (LOD) system for playback. The system will maintain a **constant snapshot budget** (approx. 300 snapshots) regardless of the selected time duration. This ensures optimal performance and predictable memory usage while maximizing data fidelity for any given window.

**Formula:**
$$\text{Interval (minutes)} \approx \frac{\text{Duration (minutes)}}{\text{Target Snapshots (300)}}$$

## Proposed Solution

### 1. State Model Migration (Redux)
*   **Current State**: `playbackSlice` uses `date` (string) and `time` (string) to represent a single point in time.
*   **New State**: Replace `date` and `time` with `startDateTime` and `endDateTime` (ISO 8601 strings).
*   **Derived State**: `interval` (number of minutes) and `baseStepMs` (milliseconds) should be derived from the difference between `startDateTime` and `endDateTime`.

### 2. Dynamic Resolution Engine
*   In `playbackSlice.js`, implement a selector/thunk that calculates the optimal `interval` for the backend request.
*   Constraint: `interval` must be at least `1` (the minimum resolution in the DB).

### 3. UI/UX Overhaul (Playback Control Center)
*   **Decompose `DateTimeViewer.jsx`**: Split into reusable sub-components:
    *   `DateTimePickerBox`: A combined Date + Time picker. This must be instantiated twice: once for the Start range and once for the End range.
    *   `TimezonePickerBox`: For timezone selection.
*   **Redesign `PlaybackPanel.jsx`**: Integrate the new pickers into a unified control bar.
    *   **Row 1**: `HourStatusStrip` (Data availability bar).
    *   **Row 2**: `Slider` (Scrubbing) + `Time Display` (Current/End).
    *   **Row 3**: `Configuration Row` (Start Picker, End Picker, Timezone Picker, Transport Controls).
*   **Dynamic Step**: The playback "Step" buttons and the `Slider` must use the dynamic `baseStepMs`.

### 4. Technical Requirements & Constraints
*   **Snapshot Cap**: Maintain ~300 snapshots per request.
*   **Minimum Resolution**: 1 minute.
*   **Maximum Resolution**: Determined by the 300-snapshot budget.
*   **Validation**: `endDateTime` must always be $> \text{startDateTime} + 1\text{ hour}$ (to prevent degenerate ranges).

## Implementation Roadmap

### Phase 1: Redux & API Foundation
- [ ] Update `playbackSlice.js` schema (`startDateTime`, `endDateTime`).
- [ ] Implement `calculateOptimalInterval` logic.
- [ ] Update `api.js` to pass the dynamic `interval` to the backend.

### Phase 2: Component Refactoring
- [ ] Refactor `DateTimeViewer.jsx` into atomic components.
- [ ] Integrate new pickers into `PlaybackPanel.jsx`.
- [ ] Update `PlaybackPanel` styles for the new layout.

### Phase 3: Playback Logic Update
- [ ] Update `PlaybackPanel` to use dynamic `baseStepMs` for the `Slider` and playback loop.
- [ ] Ensure `HourStatusStrip` correctly renders segments based on the new dynamic range.

### Phase 4: Verification
- [ ] Test 1-hour range (should see 1-minute resolution).
- [ ] Test 24-hour range (should see 5-minute resolution).
- [ ] Test 7-day range (should see ~30-minute resolution).
- [ ] Verify no OOM/performance degradation during transitions.
