# Keto Explainer - Design Document
*Decision Bible & Implementation Blueprint*

## Project Philosophy

**"Evidence-based education through progressive disclosure"**

This project embodies a commitment to scientific accuracy, user agency, and accessibility. We treat metabolic nutrition as a medical topic requiring nuanced, individualized guidance rather than one-size-fits-all recommendations.

### Core Tenets
- **Evidence First**: Every claim traceable to research with quality indicators
- **Medical Heritage**: Rooted in 100+ years of epilepsy treatment, not diet trends  
- **Individual Variation**: Emphasize personal response differences
- **Progressive Disclosure**: Information depth scales with user needs
- **No Commercial Bias**: Zero affiliate links, product placement, or monetization

## Architecture Overview

### Single-File Philosophy
**Decision**: Deliver everything as one HTML file (~2MB total)

**Rationale**:
- **Zero dependencies**: Works offline, loads instantly, survives link rot
- **Version control**: One file = one version, eliminates CDN/dependency hell
- **Shareability**: Can be emailed, stored locally, archived indefinitely
- **Privacy**: No tracking, external requests, or data collection

**Trade-offs Accepted**:
- Larger initial download vs. progressive loading
- Limited to browser storage vs. cloud persistence
- Manual updates vs. dynamic content management

### State Management Strategy

```javascript
// URL-based state encoding
?bookmarks=["overview","safety"]&depths={"science":"technical"}&profile={"macros":{"saved":true}}

// localStorage persistence
appState = {
  bookmarks: [],           // User-marked sections
  currentDepth: {},        // Per-module depth preferences  
  userProfile: {},         // Calculator settings & results
  ketoneReadings: [],      // Tracking data arrays
  symptomEntries: [],      // 
  calculatorProfiles: [],  // Saved configurations
  transitionPlan: null     // Start Here plan settings + repeated weeks
}
```

**Design Decision**: Hybrid URL + localStorage approach
- **URL handles**: Bookmarks, depth settings, user profile (shareable state)
- **localStorage handles**: Tracking data, saved profiles, the transition plan (persistent but private)
- **sessionStorage**: Backup/fallback layer

## Information Architecture

### Module System Design

#### 1. Adaptive Depth Layers
```
Basic     → "Ketosis burns fat for fuel"
Detailed  → "Liver converts fatty acids to ketone bodies serving as glucose alternative"  
Technical → "β-oxidation → acetyl-CoA → HMG-CoA synthase → acetoacetate/β-hydroxybutyrate"
```

**Implementation**: CSS-based show/hide with smooth transitions, preserves scroll position

#### 2. Cross-Module Relationships
- **Prerequisites**: Overview required before technical content
- **Recommendations**: Dynamic "what next" based on current position
- **Cross-references**: Related content highlighted when viewing specific topics

#### 3. Evidence Integration System
```css
.evidence-high    /* Green: Systematic reviews, large RCTs */
.evidence-medium  /* Yellow: Mixed results, smaller studies */  
.evidence-low     /* Red: Case studies, speculation */
```

**Decision**: Visual indicators over academic citation format for broader accessibility

The label text inside an indicator varies with what is being said. Under `.evidence-low`, the
Start Here module uses "No Trial Evidence", "Expert Practice" and "Practice-Based" so that a
tactic or a clinician habit is never dressed as a research finding.

### Content Organization Principles

#### Progressive Disclosure Hierarchy
0. **Start Here**: The reader's own transition plan and today's one action
1. **Overview**: Essential concepts, safety warnings, personal relevance
2. **Foundation**: Core science, basic implementation, evidence quality
3. **Implementation**: Detailed protocols, monitoring, troubleshooting
4. **Deep Dive**: Research methodology, advanced topics, edge cases

#### Modular Independence  
- Each module can be understood independently
- Cross-references provide context without requiring sequential reading
- Bookmark system supports non-linear exploration

## User Experience Design

### Theme System Architecture
**Decision**: Three-state theme management vs. binary dark/light

```javascript
themeStates = {
  'system': 'Follow OS preference with real-time updates',
  'light':  'Force light theme regardless of system',  
  'dark':   'Force dark theme regardless of system'
}
```

**Rationale**: Respects user preference hierarchy (explicit choice > system setting > default)

### Navigation Philosophy
**"Tools in corners, content in center"**

```
Desktop Layout:
┌─[Bookmarks]──────────────────────[Menu]─┐
│                                         │
│         Content (unlimited width)       │  
│                                         │
│    [Progress Bar spans full width]      │
└─────────────────────────────────────────┘

Mobile Layout:  
┌─[☰]────────────────────────────[📌]─┐
│                                     │
│    Content (responsive stacking)    │
│                                     │
└─────[Progress]─────────────────────┘
```

### Data Management Philosophy
**"Granular control with minimal interface"**

#### Icon-Based Controls Design
- **💾 Save**: Explicit user control over persistence
- **📥 Load**: Restore previous state/configurations  
- **📤 Export**: Download JSON for backup/sharing
- **📂 Import**: Upload previously exported data
- **🗑️ Clear**: Granular deletion with confirmation

**Decision**: Icons + tooltips vs. verbose button text
- Saves space while maintaining clarity
- Universal symbols transcend language barriers
- Hover/touch reveals detailed actions

#### Data Persistence Strategy
```javascript
// Tracking data: localStorage only (private, persistent)
ketoneReadings: [{datetime, level, timestamp}]
symptomEntries: [{date, energy, clarity, appetite, cravings?, symptoms}]

// Transition plan: localStorage + JSON export only (private; never in the URL)
transitionPlan: {path, pace, startDate, startCarbs, targetCarbs, targetFastHours, lastMeal, holds}

// User preferences: URL + localStorage (shareable + persistent)  
bookmarks: ['module-id-1', 'module-id-2']
currentDepth: {module: 'basic|detailed|technical'}

// Calculator profiles: localStorage arrays (reusable configurations)
calculatorProfiles: [{age, sex, height, weight, activity, goal, macros, savedDate}]
```

## Interactive Tools Design

### Calculator System Architecture
**Multi-unit, Multi-profile Approach**

```javascript
calculateMacros() {
  // Imperial/Metric unit system support
  // Mifflin-St Jeor BMR calculation  
  // Activity multiplier application
  // Ketogenic ratio distribution (70-75% fat, 20-25% protein, 5-10% carbs)
  // Goal adjustment (maintenance/deficit/surplus)
}
```

**Design Decisions**:
- **Save/Load profiles**: Support multiple family members or goal changes
- **Real-time calculation**: Immediate feedback as inputs change
- **Prominent disclaimers**: Individual variation warnings throughout

### Tracking Tools Philosophy
**"Medical monitoring, not gamification"**

#### Ketone Level Tracking
- **Clinical interpretation**: 0.5-3.0mM optimal range with explanations
- **Trend awareness**: Historical display without arbitrary goals
- **Export capability**: Share data with healthcare providers

#### Symptom Monitoring
- **Adaptation focus**: Energy, clarity, appetite as primary metrics
- **Symptom checklist**: Common "keto flu" tracking
- **Timeline context**: Relate symptoms to adaptation phases

**Rejected Approaches**:
- ❌ Gamification elements (streaks, badges, points)
- ❌ Social sharing/comparison features  
- ❌ Automated coaching that changes targets or advice on its own. The transition plan below is
  a fixed schedule built from the reader's own settings; only the reader advances or repeats it.
- ❌ Integration with fitness trackers or external APIs

### Transition Plan (Start Here module)
**"One change a week, and the week can repeat"**

The first module turns the explainer into something to act on: a week-by-week schedule from a
high-carb diet to a chosen landing, with a Today card that leads with this week's one action.

```
Paths    carbs (step-down) | fasting (window ladder) | both (carbs first, then fasting)
Paces    gentle (default)  | standard (twice as fast)

carbs    250 → 215 → 185 → 150 → 115 → 85 → 50 g   one behaviour change per week
fasting  12 → 13 → 14 → 15 → 16 h                  last meal fixed, first meal moves later
both     carb weeks on a 12 h overnight baseline, then the fasting ladder at the carb landing

Today card   before start: countdown + week 1 preview
             active:       week N of M, the one change, targets, log count, repeat rule, next step
             landed:       final targets, hold
```

**Design Decisions** (each with what would re-open it):
- **Start Here sits above Overview.** A reader mid-diet returns for today's action, so it comes
  first. Re-open if new visitors should meet the explainer first: move the module block below
  Overview and update the order asserted in `tests/page-structure.test.mjs`.
- **Gentle pace is the default.** A hard transition is the assumed case: six carb weeks, one
  hour of fasting added per week. Re-open if six-plus weeks proves too slow to hold.
- **Default landing is 50 g net carbs ("pseudo-keto").** It sits on the boundary of the
  ketogenic range; 100 g (low-carb) and 20-30 g (strict) are named alternatives. Re-open if
  "pseudo-keto" should mean a looser band such as 75-100 g: change `DEFAULT_PLAN.targetCarbs`.
- **Never two changes in one week.** The "both" path finishes the carb step-down before
  lengthening the fast. The order is a judgment (appetite tends not to rise in ketosis) and is
  untested; the module says so.
- **A rough week repeats instead of failing.** Three rough days (energy 3 or lower, cravings 8
  or higher, or three symptoms) is the stated signal. The card shows the reader's own counts and
  the reader presses Repeat; the plan never moves on its own. Thresholds are a starting rule:
  `ROUGH_DAY` and `ROUGH_DAYS_TO_REPEAT_WEEK` in `plan-core`.
- **No streaks; a slip resets nothing.** Position comes from the calendar and the start date,
  so there is nothing to break.
- **The last meal is the fixed anchor.** Dinner is the socially fixed meal, so a longer fast
  moves the first meal later. An early eating window needs no code: set an earlier last meal.
- **Carb ceilings are a guide, the weekly behaviour change is the lever.** Counting is optional.
- **Editing settings keeps repeated weeks only when the list of steps is unchanged.** Repeats
  are stored as step indexes, which lose their meaning if path, pace or targets change.
- **The symptom log carries cravings, muscle cramps and dizziness** because they feed the rough
  day rule and the rough-moment playbook. Entries saved without cravings stay valid.
- **Health numbers in this module are sourced and labelled, and gaps are stated.** No trial
  compares gradual with abrupt carb reduction; electrolyte figures are clinician practice above
  the US sodium limit; fasting windows show small weight effects. The Why & Evidence layer says
  each of these plainly rather than implying support that does not exist.
- **New controls use `#2c7a7b` with white text** (5.0:1) so the 4.5:1 contrast rule holds.

## Technical Implementation Patterns

### CSS Architecture
```css
/* Custom properties for theme consistency */
:root {
  --primary-color: #1a365d;
  --secondary-color: #4a5568;  
  --accent-color: #38b2ac;
  /* ... etc */
}

/* Dark mode through body class toggle */
body.dark {
  --primary-color: #0d1117;
  /* ... redefined properties */
}
```

**Decision**: CSS custom properties vs. JavaScript style injection
- Better performance and browser optimization
- Easier maintenance and debugging
- Smooth transitions between themes

### JavaScript Patterns
```javascript
// Module pattern for organization
const appState = { /* centralized state */ };

// Event-driven updates
function updateKetoneHistory() { 
  // Update UI
  // Save to localStorage  
  // Trigger status updates
}

// Error handling
try {
  localStorage.setItem('ketoAppState', JSON.stringify(appState));
} catch (e) {
  showDataMessage('Storage full. Export data to free space.', 'error');
}
```

### Script Layout and Tests
The single-file rule holds. Inside the file, scripts are split by block so the parts with no
browser dependency can be loaded and tested by node directly.

```
<script id="plan-core">  PlanCore: schedule, dates, eating-window clock, rough-week rule,
                         plan validation. No DOM, no storage, no clock.
<script id="plan-view">  PlanView: HTML strings for the Today card and schedule. No DOM.
<script id="app">        State, persistence, handlers; thin glue over the two blocks above.
```

```
node --test tests/*.test.mjs        # no dependencies; Node's built-in runner

tests/plan-schedule, plan-day, plan-today   PlanCore behaviour
tests/plan-view                             what the Today card and schedule say
tests/app-wiring                            the real app script against a fake DOM
tests/page-structure                        module order, depth panels, handlers and ids
                                            resolve, pure blocks stay pure, no network loads

node scripts/render-snapshots.mjs   # PNGs of each plan state via macOS Quick Look
```

**Decision**: a fake DOM and Quick Look snapshots instead of a headless browser, because the
project takes no dependencies. Limits: the fake DOM does not lay anything out, and Quick Look
renders at desktop width only, so the mobile layout is checked by hand.

### Accessibility Implementation
- **Semantic HTML**: Proper heading hierarchy, form labels, ARIA attributes
- **Color contrast**: 4.5:1 minimum ratio, tested in both themes
- **Keyboard navigation**: All interactive elements accessible via tab/enter
- **Screen reader**: Text alternatives for icons, meaningful element descriptions

## Content Strategy & Quality Control

### Evidence Standards
```markdown
Research Citation Format:
- **Author (Year)** - Study type, sample size, duration  
- Key findings with limitations noted
- Quality indicator: [High/Medium/Low Evidence]
```

### Writing Principles
- **Active voice**: "Research shows..." vs. "It has been shown..."
- **Uncertainty acknowledgment**: "Limited evidence suggests..." when appropriate
- **Individual variation**: "Some people experience..." not "You will experience..."
- **Medical boundaries**: "Consult healthcare provider" for any implementation advice

### Update Workflow
1. **Research review**: New studies evaluated quarterly
2. **Content revision**: Outdated information flagged and updated  
3. **User feedback**: Address clarity issues and common questions
4. **Version control**: Maintain backward compatibility for bookmarked URLs

## Security & Privacy Design

### Data Privacy
- **No external requests**: Zero tracking, analytics, or third-party services
- **Local storage only**: All user data remains on device
- **Export control**: Users explicitly choose what to share/backup
- **No personal information**: Calculator uses general parameters only

### Content Security
- **Medical disclaimers**: Clear boundaries on educational vs. medical advice
- **Contraindication warnings**: Prominent safety information
- **Source attribution**: All research claims linked to original sources
- **Regular updates**: Outdated information flagged and revised

## Future Considerations

### Potential Enhancements
- **Offline-first**: Service worker for complete offline functionality
- **Print optimization**: CSS for healthcare provider handouts  
- **Multi-language**: i18n framework for global accessibility
- **Research API**: Integration with PubMed for dynamic updates

### Scalability Limits
- **File size**: ~5MB maximum before performance degrades
- **localStorage**: ~10MB browser limit affects tracking data
- **Complexity**: Single-file architecture limits advanced features

### Maintenance Strategy
- **Quarterly content review**: Research updates and fact-checking
- **Annual architecture review**: Technical debt and optimization
- **User feedback integration**: Clarity improvements and feature requests
- **Browser compatibility**: Modern standard adoption timeline

## Success Metrics

### User Behavior
- **Session duration**: Time spent with content indicates engagement
- **Return visits**: Frequency suggests ongoing utility value
- **Bookmark patterns**: Most-saved content indicates user priorities  
- **Export usage**: Data backup suggests trust and ongoing use

### Educational Impact
- **Comprehension accuracy**: Post-interaction understanding assessment
- **Medical consultation**: Appropriate healthcare provider engagement
- **Implementation safety**: Reduced adverse effects through proper education
- **Myth correction**: Decreased propagation of misinformation

---

## Implementation Principles Summary

1. **Evidence First**: Every factual claim backed by research
2. **User Agency**: Tools empower decisions without prescribing them
3. **Progressive Disclosure**: Information depth matches user needs
4. **Persistent Context**: State management enables resumable exploration
5. **Accessible by Default**: Design for diverse abilities and technologies
6. **Privacy Preserving**: User data remains local and under user control
7. **Maintenance Ready**: Architecture supports content updates and improvements

*"A medical education resource disguised as a web application, built with the permanence of print and the interactivity of software."* 