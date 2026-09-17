# Aroow

Aroow is a minimalist arrow-puzzle game. Guide the player through no-revisit mazes, walls, gates, keys, portals, ice, one-way tiles, spikes, and moving saws.

## Campaign

The campaign contains 500 sequential levels across progressive difficulty bands. Early levels use classic rules with three lives and undo. Later levels introduce stricter execution:

- `MEDIUM`: two lives and limited undo
- `EXPERT` and `MASTER`: one life, no undo, and time limits

Every generated level is checked by the built-in solver before it is used. Progress, stars, best moves, and completion times are stored locally for offline play.

## Development

```bash
npm install
npm run dev
```

Run the test suite and production build with:

```bash
npm test
npm run build
```
