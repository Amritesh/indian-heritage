```markdown
# Design System Specification: The Digital Curator

## 1. Overview & Creative North Star
This design system is anchored by the Creative North Star of **"The Digital Curator."** Unlike standard mobile applications that prioritize speed and disposability, this system prioritizes *permanence, scholarship, and prestige*. It is a digital sanctuary for Indian heritage, moving away from "app-like" behaviors toward a high-end editorial experience.

To break the "template" look common in modern SaaS, this system utilizes **Intentional Asymmetry**. We do not center everything; we use the weight of high-resolution artifacts against generous white space (Parchment) to create a sense of museum-grade breathability. We favor overlapping elements—such as a serif headline partially breaking the boundary of a Sandstone container—to mimic the layered nature of physical archives and historical manuscripts.

---

## 2. Colors: The Palette of Antiquity
The color strategy avoids the vibrancy of consumer tech in favor of the muted, light-fast pigments found in ancient frescoes and weathered stone.

*   **Primary (`#775a19` - Antique Gold):** Used for "Authentication" and "Value." Reserved for high-importance calls to action and signature ornamental flourishes.
*   **Secondary (`#b22b1d` - Temple Red):** Used as a scholarly "Stamp" or "Wax Seal." Use sparingly for critical errors or high-prestige alerts.
*   **Neutral Tones (Parchment & Ivory):** Our canvas. These are not just backgrounds; they represent the tactile nature of aged paper (`surface_container_lowest`).

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid hex-black or high-contrast borders for sectioning. 
*   **Defining Boundaries:** Use background shifts. A `surface_container_low` section sitting on a `surface` background creates a soft, sophisticated edge that feels structural rather than drawn.
*   **Nesting:** Depth is achieved by "stacking" papers. Place a `surface_container_highest` card on a `surface_container_low` background to define its importance.

### The "Glass & Gradient" Rule
To ensure the UI feels premium rather than "flat-retro," utilize **Glassmorphism**. Floating navigation bars or header overlays should use semi-transparent `surface_variant` colors with a high backdrop-blur (20px+). 
*   **Signature Textures:** Apply a subtle radial gradient (e.g., `primary` to `primary_container`) to hero CTAs to simulate the luster of aged bronze.

---

## 3. Typography: The Scholarly Voice
The typography is a dialogue between the **Display (Noto Serif)**—representing the weight of history—and the **Functional Metadata (Inter/Manrope)**—representing modern archival precision.

*   **Display & Headlines (Noto Serif):** These are the "Voices of Authority." Use `display-lg` for artifact titles. Large tracking (letter-spacing) should be avoided here; let the elegant serifs provide the character.
*   **Titles & Body (Manrope):** The workhorse. Manrope offers a clean, neutral counter-balance to the ornate headlines. Use `title-lg` for navigation and `body-md` for scholarly descriptions.
*   **Labels (Inter):** High-utility metadata (dates, weights, dimensions). Use `label-md` in all-caps with a `0.05em` letter-spacing to evoke the look of museum identification tags.

---

## 4. Elevation & Depth: Tonal Layering
Traditional "drop shadows" are too aggressive for a museum environment. We use **Ambient Shadows** and **Tonal Layering**.

*   **The Layering Principle:** Stack `surface-container` tiers. For example, a "Provenance" card (`surface_container_lowest`) should sit atop a "Collection" background (`surface_container_low`). The 1-step shift in tone provides all the hierarchy needed.
*   **Ambient Shadows:** If a card must float, the shadow must be a tinted version of the `on_surface` color (a deep charcoal-brown, not black) at 4-6% opacity with a blur radius of 16px or higher.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar background, use a "Ghost Border": the `outline_variant` token at **15% opacity**. This creates a "suggestion" of an edge, reminiscent of a watermark on paper.

---

## 5. Components

### Archival Cards
Forbid the use of divider lines. Separate the "Header" (Artifact Name) from the "Metadata" (Period/Region) using a `2.5` (0.85rem) vertical spacing unit. Use `surface_container_high` for the card background to give it a "thick cardstock" feel.

### Buttons (The Curatorial CTAs)
*   **Primary:** `primary` background with `on_primary` text. Use `md` (0.375rem) corner radius. Avoid "Pill" shapes; we want the architectural stability of subtle corners.
*   **Tertiary:** No background. Use `primary` text with an `outline_variant` "Ghost Border" that only appears on hover/interaction.

### Archival Labels & Chips
Small, rectangular tags with `sm` (0.125rem) radius. Use `surface_variant` backgrounds with `on_surface_variant` text in `label-sm` (Inter). They should look like physical labels pinned to a specimen board.

### Timeline Selectors
A horizontal "Thread" using the `outline` token at 20% opacity. Selected years/eras use the `secondary` (Temple Red) color as a "dot" to signify a wax seal of approval.

### Tree Accordions (Provenance & Lineage)
Use a "nested paper" look. When an accordion opens, the child content should have a slightly darker background (`surface_container_highest`) than the parent to show containment through color, not lines.

---

## 6. Do’s and Don’ts

### Do:
*   **DO** use white space as a structural element. If a screen feels crowded, increase the spacing to `10` or `12` units.
*   **DO** use "Aged Paper" textures (subtle grain) as a background overlay at 3% opacity to break the sterility of the digital screen.
*   **DO** treat imagery as the "Hero." Every photo should have a `surface_dim` subtle shadow to make it feel like a physical photograph placed on a desk.

### Don’t:
*   **DON'T** use 100% black (`#000000`). Always use `Rich Black` (`#121212`) or `Charcoal` (`#212121`) for text to maintain a softer, archival feel.
*   **DON'T** use high-speed, bouncy animations. Use "Ease-in-out" transitions with durations of 400ms+ to mimic the slow, deliberate turning of a page or opening of a cabinet.
*   **DON'T** use generic icons. Every icon should have a consistent "engraved" weight, using the `outline` token.

---

**Director’s Final Note:**
*This system is not a tool; it is a legacy. Every pixel should feel like it was placed by a curator wearing white gloves. If a layout feels "busy," remove an element—don't add a line.*```