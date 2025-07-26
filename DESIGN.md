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
  calculatorProfiles: []   // Saved configurations
}
```

**Design Decision**: Hybrid URL + localStorage approach
- **URL handles**: Bookmarks, depth settings, user profile (shareable state)
- **localStorage handles**: Tracking data, saved profiles (persistent but private)
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

### Content Organization Principles

#### Progressive Disclosure Hierarchy
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
symptomEntries: [{date, energy, clarity, appetite, symptoms}]

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
- ❌ Automated coaching or recommendations
- ❌ Integration with fitness trackers or external APIs

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