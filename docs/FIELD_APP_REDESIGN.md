# System22 Field App — Dark Pro Redesign (Phase 2)

**Status:** Design Complete  
**Visual Direction:** Dark Pro  
**Date:** 2026-06-13

## Overview

Redesigned the System22 Field/Manager app main screen from a fictional map-based interface to a proper job list view that aligns with the actual Installation Manager workflow.

## Design Direction: Dark Pro

### Color Palette
- **Background:** oklch(12% 0.01 240) — Deep slate
- **Surface Elevated:** oklch(16-20% 0.01 240) — Layered depth
- **Text Primary:** oklch(96% 0.01 240) — High contrast white
- **Text Secondary:** oklch(72% 0.01 240) — Reduced emphasis
- **Text Tertiary:** oklch(52% 0.01 240) — Muted labels
- **Accent:** oklch(54% 0.24 64) — Warm amber (interactive elements)
- **Status Pending:** oklch(58% 0.22 48) — Warm orange
- **Status Query:** oklch(63% 0.22 16) — Red alert
- **Status Ordered:** oklch(56% 0.2 128) — Teal/green

### Typography
- **Primary Font:** Inter (modern geometric sans)
- **Monospace:** JetBrains Mono (technical references)
- **Text Rendering:** High contrast (96% vs 12% background) for outdoor sunlight legibility

### Key Features
- **Deep Slate Background:** oklch 12-20% range for comfortable outdoor viewing
- **Warm Amber Accents:** oklch 54% 0.24 64 for interactive states and highlights
- **Dense Information Layout:** Multiple data points per card (reference, developer, location, status badges)
- **High Contrast:** Ensures readability in bright outdoor conditions
- **Geometric Sans Typography:** Clean, modern appearance

## Actual Workflow (Installation Manager)

### Primary Screen: Job List
Shows assigned tickets/jobs the Installation Manager needs to work on.

**Job Card Contents:**
- Status indicator dot (color-coded)
- Ticket reference (TKET-XXXX) in monospace
- Developer/project name (prominent)
- Location and plot number
- Status badges (awaiting acceptance, in progress, etc.)
- Unread message indicators
- Navigation chevron

**Time-Based Grouping:**
- TODAY — Urgent, same-day assignments
- TOMORROW — Scheduled for next day
- LATER — Future assignments

**Status Indicators:**
- **Pending:** Awaiting acceptance by Installation Manager
- **Query:** Awaiting clarification from office/manager
- **Ordered:** Items ordered, in progress

### Navigation Tabs
- **Jobs** (active) — Main job list view
- **Sites** — Site/location-based view (future)
- **More** — Settings, profile, offline status (future)

## Improvements Over Previous Map Design

✅ **Actual Workflow:** Replaced fictional map with real job list  
✅ **Field-Appropriate:** Optimized for outdoor mobile use  
✅ **High Contrast:** 96% text on 12% background for sunlight readiness  
✅ **Status Clarity:** Clear status indicators and metadata  
✅ **Information Density:** Multiple data points without clutter  
✅ **Consistent with Office Side:** Matching design tokens and typography  
✅ **Dark Theme:** Reduced eye strain in outdoor conditions  

## Design Artifacts

- **Mockup:** `/home/jason-price/remedial/mockup/field-mobile-dark-pro.html`
- **Design System:** Open Design project `b5ce7414-9203-4c8a-a522-1a8565ae2fff`

## Next Steps

1. **Implementation** — Apply this design to React components in `frontend-manager/src/`
2. **Color Palette Integration** — Update design tokens in `frontend-manager/index.css`
3. **Component Updates:**
   - Job list component (main view)
   - Job card component
   - Status indicator component
   - Navigation component
4. **Testing** — Verify outdoor sunlight readability and touch targets
5. **Mobile PWA Features** — Ensure offline capability and background sync

## Design Consistency

This redesign maintains consistency with the office side Dark Pro redesign:
- Same oklch-based color system
- Same typography stack (Inter + JetBrains Mono)
- Similar card-based interaction patterns
- Consistent status indicator colors across both surfaces
- Premium minimalist aesthetic throughout
