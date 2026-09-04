# Dark Enterprise UI merged into PM-FINAL

The Lovable premium dark Admin Dashboard UI was merged into the newer PM-FINAL source.

Preserved from PM-FINAL:
- backend/business-logic fixes
- technician deactivation behavior and history-preserving copy
- error/not-found handlers
- API contract verification and reliability audit additions

Merged from the Dark Enterprise UI package:
- `.pm-shell` scoped dark design system
- dashboard shell/home styling
- sidebar and topbar styling
- shared admin UI classes
- modal/drawer backdrop polish
- token-based styling in affected admin components

No `.env`, `.env.local`, secret, database, or backend business-logic files were added or overwritten by this merge.
