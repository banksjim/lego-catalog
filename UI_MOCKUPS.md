# UI Mockups & Design Specifications

This document describes the visual design and user interface of the Lego Catalog application.

## Design Philosophy

- **Clean & Modern**: Professional appearance with card-based layouts
- **Responsive**: Seamless experience across desktop, tablet, and mobile
- **Accessible**: High contrast, proper spacing, clear typography
- **Theme Support**: Beautiful light and dark modes

## Color Scheme

### Light Mode
- **Primary**: Red/Crimson (#ef4444 to #dc2626) - Inspired by classic Lego red
- **Background**: Soft gray (#f9fafb)
- **Cards**: Pure white (#ffffff)
- **Text**: Dark gray (#111827)
- **Borders**: Light gray (#e5e7eb)

### Dark Mode
- **Primary**: Lighter red (#f87171 to #ef4444)
- **Background**: Very dark gray (#111827)
- **Cards**: Dark gray (#1f2937)
- **Text**: Off-white (#f9fafb)
- **Borders**: Medium gray (#374151)

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Navigation Bar (Fixed Top)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Lego Catalog | Dashboard | My Sets | Add Set  [🌙] │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Main Content Area                        │
│                  (Max Width Container)                      │
│                                                             │
│                     [Page Content]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Page Mockups

### 1. Dashboard Page

```
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard                                    [+ Add New Set]    │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐│
│  │ 📦 Total    │  │ ✓ Owned     │  │ 🧱 Total    │  │ 💰Total ││
│  │ Sets        │  │ Sets        │  │ Pieces      │  │ Value   ││
│  │    156      │  │    142      │  │   245,893   │  │ $12,450 ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘│
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │ 👤 Total    │  │ 📊 Average  │                              │
│  │ Minifigs    │  │ Value       │                              │
│  │    1,247    │  │   $87.68    │                              │
│  └─────────────┘  └─────────────┘                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ Most Expensive Set          │ │ Largest Set (by parts)      ││
│  │ ┌───────┐                   │ │ ┌───────┐                   ││
│  │ │ [IMG] │ UCS Millennium    │ │ │ [IMG] │ Colosseum         ││
│  │ └───────┘ Falcon            │ │ └───────┘ #10276            ││
│  │           #75192            │ │           9,036 pieces      ││
│  │           $849.99           │ │                             ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

**Features:**
- 6 statistics cards showing key metrics
- Icons for visual appeal
- Large, readable numbers
- Featured sets with images in bottom half
- Responsive grid (4 cols → 2 cols → 1 col on mobile)

### 2. My Sets Page (List View)

```
┌────────────────────────────────────────────────────────────────────┐
│  My Lego Sets          [Export CSV] [Import CSV] [+ Add Set]       │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Search: [_____________] Series: [All ▾] Owned: [All ▾]       │ │
│  │ Sort By: [Title ▾] [↑]                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Total value of owned sets: $12,450.00     142 owned set(s)   │ │
│  └──────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │
│  │ │             │ │  │ │             │ │  │ │             │ │  │
│  │ │   [Image]   │ │  │ │   [Image]   │ │  │ │   [Image]   │ │  │
│  │ │             │ │  │ │             │ │  │ │             │ │  │
│  │ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │  │
│  │ Colosseum  [✓ 1]│  │ Haunted House   │  │ Millennium      │  │
│  │ Set #10276      │  │ Set #10273      │  │ Falcon    [✓ 1] │  │
│  │ Creator Expert  │  │ Fairground      │  │ Set #75192      │  │
│  │ Year: 2020      │  │ Year: 2019      │  │ Star Wars       │  │
│  │ Parts: 9,036    │  │ Parts: 3,231    │  │ Year: 2017      │  │
│  │ Value: $549.99  │  │ Minifigs: 0     │  │ Parts: 7,541    │  │
│  │ [Edit] [Delete] │  │ [Edit] [Delete] │  │ Value: $849.99  │  │
│  └─────────────────┘  └─────────────────┘  │ [Edit] [Delete] │  │
│                                             └─────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Search bar with real-time filtering
- Dropdown filters for series and ownership
- Sort selector with ascending/descending toggle
- Total value banner (only shown when owned sets exist)
- Responsive card grid (3 cols → 2 cols → 1 col on mobile)
- Each card shows:
  - Image (or placeholder if none)
  - Title with ownership badge
  - Set number
  - Series name in accent color
  - Key stats (year, parts, minifigs, value)
  - Edit and Delete buttons

### 3. Add/Edit Set Form

```
┌────────────────────────────────────────────────────────────────┐
│  Add New Lego Set                                              │
├────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Set Image                                                │ │
│  │ ┌─────────┐                                              │ │
│  │ │         │ [Choose File] No file chosen                 │ │
│  │ │ Preview │ You can also paste an image from your        │ │
│  │ │         │ clipboard (Ctrl+V / Cmd+V)                   │ │
│  │ └─────────┘                                              │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Set Number *         │ Alternate Set Number             │ │
│  │ [10276_________]     │ [_______________]                │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Title *                                                  │ │
│  │ [Colosseum_______________________________________]       │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Description                                              │ │
│  │ [Roman Colosseum - one of the largest Lego sets ever]  │ │
│  │ [created with incredible detail and accuracy...      ]  │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Series               │ Release Year                     │ │
│  │ [Creator Expert___]  │ [2020______]                     │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ ☑ I own this set                                        │ │
│  │ Quantity Owned: [1__]                                    │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Number of Parts      │ Number of Minifigs               │ │
│  │ [9036_______]        │ [0__]                            │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Approximate Value ($)│ Value Last Updated               │ │
│  │ [549.99_____]        │ [2024-01-15]                     │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Bricklink URL                                            │ │
│  │ [https://www.bricklink.com/v2/catalog/catalogitem...]   │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ Notes                                                    │ │
│  │ [Still sealed in box. Purchased from Lego Store...]    │ │
│  │ [                                                    ]   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                       [Cancel] [Create Set]   │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Clean, sectioned form layout
- Image upload with drag-and-drop support
- **Clipboard paste support** - paste images directly with Ctrl+V
- Required fields marked with asterisk
- Organized sections with visual separators
- Input validation (numbers, URLs, dates)
- Clear action buttons at bottom
- Fully responsive (2 column → 1 column on mobile)

## Mobile Responsive Behavior

### Phone (< 640px)
- Navigation collapses to hamburger menu
- Statistics cards stack vertically (1 column)
- Set cards stack vertically (1 column)
- Form inputs stack vertically (1 column)
- Search and filters stack vertically

### Tablet (640px - 1024px)
- Statistics: 2 columns
- Set cards: 2 columns
- Form maintains 2-column layout for related fields
- All features remain accessible

### Desktop (> 1024px)
- Statistics: 4 columns (top row) + 2 columns (bottom row)
- Set cards: 3 columns
- Form: 2 columns for related fields
- Maximum content width for readability

## Interactive Elements

### Buttons
- **Primary Actions** (Add Set, Create Set): Red background, white text, shadow
- **Secondary Actions** (Edit, Export): White/gray background, border, gray text
- **Destructive Actions** (Delete): Red border, red text
- **Hover Effects**: Slight color shift, cursor pointer
- **Disabled State**: Reduced opacity, no pointer

### Cards
- White background (light) / Dark gray (dark mode)
- Subtle shadow
- Rounded corners (8px)
- Hover effect: Increased shadow elevation

### Form Inputs
- Rounded corners (6px)
- Gray border, focus ring in primary color
- Proper spacing and padding
- Dark mode: Dark background with lighter border

### Navigation
- Fixed top bar with shadow
- Active page indicator (red underline)
- Smooth hover transitions
- Mobile menu slides in from side

## Icons Used
- Dashboard: 📦 (box), ✓ (checkmark), 🧱 (brick), 💰 (money), 👤 (person), 📊 (chart)
- Theme Toggle: 🌙 (moon) / ☀️ (sun)
- Actions: 🔍 (search), ↑↓ (sort), ✏️ (edit), 🗑️ (delete)
- Set Details: Image placeholder icon when no image

## Typography
- **Headings**:
  - H1: 30px, bold
  - H2: 24px, semibold
  - H3: 18px, medium
- **Body**: 14px-16px, regular
- **Small Text**: 12px-14px, regular
- **Font Family**: System fonts (San Francisco, Segoe UI, Roboto, etc.)

## Accessibility Features
- High contrast text
- Keyboard navigation support
- Focus indicators on all interactive elements
- Alt text for images
- Semantic HTML structure
- ARIA labels where appropriate

## Animation & Transitions
- Theme toggle: 200ms color transition
- Hover effects: 150ms transform/shadow
- Loading spinner: Smooth rotation
- Page transitions: Subtle fade (React Router)
- Card hover: 200ms shadow elevation

## Example User Flows

### Adding a Set
1. Click "Add Set" button
2. Paste image from clipboard (Ctrl+V) - image appears instantly
3. Fill in Set Number and Title (required)
4. Add optional details
5. Click "Create Set"
6. Redirect to "My Sets" with success message

### Filtering Collection
1. On "My Sets" page
2. Type in search box - results filter in real-time
3. Select "Star Wars" from Series dropdown - further filtered
4. Select "Owned" from Ownership dropdown - only owned Star Wars sets shown
5. Total value updates to reflect filtered sets

This UI design prioritizes usability, visual appeal, and a smooth user experience across all devices.
