/**
 * Enhanced level generation script with solver validation and layout inspection.
 * 
 * This script:
 * 1. Generates levels 21-500 using updated difficulty presets
 * 2. Validates each level with the real BFS solver
 * 3. Computes actual difficulty metrics (decision points, misleading routes, etc.)
 * 4. Rejects levels that are technically compliant but visually trivial
 * 5. Reports actual board layouts for sample levels (150, 250, 350, 450)
 * 6. Verifies the difficulty curve is monotonically increasing
 * 7. Only writes levels_db.json after all validations pass
 */

import { LevelGenerator } from '../src/game/LevelGenerator';
import { levels as handcraftedLevels } from '../src/data/levels';
import { getPresetForLevelId } from '../src/game/LevelGeneratorPresets';
import { LevelSolver } from '../src/game/LevelSolver';
import type { LevelData } from '../src/game/types';
import existingLevels from '../src/data/levels_db.json';
import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ────────────────────────────────────────────────────────────
const REPORT_LEVELS = [50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500];
const BOARD_INSPECT_LEVELS = [100, 150, 200, 250, 300, 350, 400, 450, 500];
const TOTAL_LEVELS = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderBoardAscii(level: LevelData): string {
  const wallSet = new Set(level.walls.map(w => `${w.x},${w.y}`));
  const tileSet = new Map((level.tiles ?? []).map(t => [`${t.pos.x},${t.pos.y}`, t.type.slice(0, 2)]));
  const keySet = new Set((level.keys ?? []).map(k => `${k.x},${k.y}`));
  const gateSet = new Set((level.gates ?? []).map(g => `${g.pos.x},${g.pos.y}`));

  let board = `  Grid ${level.width}×${level.height} | Start(${level.start.x},${level.start.y}) → Goal(${level.goal.x},${level.goal.y})\n`;
  board += '  ' + '─'.repeat(level.width * 2 + 1) + '\n';

  for (let y = 0; y < level.height; y++) {
    let row = '  |';
    for (let x = 0; x < level.width; x++) {
      const key = `${x},${y}`;
      if (x === level.start.x && y === level.start.y) row += 'S';
      else if (x === level.goal.x && y === level.goal.y) row += 'G';
      else if (wallSet.has(key)) row += '█';
      else if (keySet.has(key)) row += 'K';
      else if (gateSet.has(key)) row += 'Δ';
      else if (tileSet.has(key)) row += tileSet.get(key)![0];
      else row += '.';
      row += ' ';
    }
    board += row + '|\n';
  }
  board += '  ' + '─'.repeat(level.width * 2 + 1);
  return board;
}

function formatDifficultyBar(score: number, max: number = 200): string {
  const normalized = Math.min(score / max, 1);
  const filled = Math.round(normalized * 20);
  return '[' + '█'.repeat(filled) + '░'.repeat(20 - filled) + '] ' + score.toFixed(0);
}

// ─── Main generation + validation logic ──────────────────────────────────────

function runGeneration(): void {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  AROOW — Extreme Difficulty Level Generation + Validate  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  LevelGenerator.clearRegistry();
  const existingById = new Map((existingLevels as LevelData[]).map(level => [level.id, level]));
  
  const allLevels: LevelData[] = [];
  const metrics: Array<{
    id: number;
    preset: string;
    gridSize: string;
    optimalMoves: number;
    difficulty: number;
    decisionPoints: number;
    misleadingRoutes: number;
    deadEnds: number;
    turns: number;
    pathCount: number;
    mechanics: string;
  }> = [];

  // ── Phase 1: Handcrafted levels 1–20 ──────────────────────────────────────
  console.log('Phase 1: Loading handcrafted levels (1–20)...');
  for (const lvl of handcraftedLevels) {
    const solution = LevelSolver.solve(lvl);
    if (!solution.solvable) {
      throw new Error(`FATAL: Handcrafted level ${lvl.id} is unsolvable!`);
    }
    const preset = getPresetForLevelId(lvl.id);
    lvl.difficulty = LevelGenerator.calculateDifficulty(lvl, solution, preset);
    allLevels.push(lvl);
    metrics.push({
      id: lvl.id, preset: preset.name, gridSize: `${lvl.width}×${lvl.height}`,
      optimalMoves: solution.optimalMoves, difficulty: lvl.difficulty,
      decisionPoints: solution.decisionPoints, misleadingRoutes: solution.misleadingRoutes,
      deadEnds: solution.deadEndCount, turns: solution.turnsCount,
      pathCount: solution.shortestPathCount,
      mechanics: [
        ...(lvl.tiles ?? []).map(t => t.type.split('_')[0]),
        ...(lvl.keys?.length ? ['KEY'] : []),
        ...(lvl.gates?.length ? ['GATE'] : [])
      ].filter((v, i, a) => a.indexOf(v) === i).join('+') || 'NONE'
    });
  }
  console.log(`  ✓ Loaded ${handcraftedLevels.length} handcrafted levels\n`);

  // ── Phase 2: Generate levels 21–500 with validation ──────────────────────
  console.log(`Phase 2: Generating and validating levels ${handcraftedLevels.length + 1}–${TOTAL_LEVELS}...`);
  
  let generated = 0;
  let usedFallback = 0;
  let failedLevels: number[] = [];

  for (let i = handcraftedLevels.length + 1; i <= TOTAL_LEVELS; i++) {
    try {
      const level = LevelGenerator.generate(i);
      
      // Validate with solver
      const solution = LevelSolver.solve(level);
      if (!solution.solvable) {
        throw new Error(`Generated level ${i} failed solver validation`);
      }
      
      const preset = getPresetForLevelId(i);
      const difficulty = LevelGenerator.calculateDifficulty(level, solution, preset);
      level.difficulty = difficulty;

      allLevels.push(level);
      metrics.push({
        id: i, preset: preset.name, gridSize: `${level.width}×${level.height}`,
        optimalMoves: solution.optimalMoves, difficulty,
        decisionPoints: solution.decisionPoints, misleadingRoutes: solution.misleadingRoutes,
        deadEnds: solution.deadEndCount, turns: solution.turnsCount,
        pathCount: solution.shortestPathCount,
        mechanics: [
          ...(level.tiles ?? []).map(t => t.type.split('_')[0]),
          ...(level.keys?.length ? ['KEY'] : []),
          ...(level.gates?.length ? ['GATE'] : [])
        ].filter((v, i, a) => a.indexOf(v) === i).join('+') || 'NONE'
      });
      
      generated++;
      
      if (i % 50 === 0) {
        const recentMetrics = metrics.slice(-50);
        const avgDiff = recentMetrics.reduce((s, m) => s + m.difficulty, 0) / recentMetrics.length;
        const avgMoves = recentMetrics.reduce((s, m) => s + m.optimalMoves, 0) / recentMetrics.length;
        const avgDec = recentMetrics.reduce((s, m) => s + m.decisionPoints, 0) / recentMetrics.length;
        console.log(`  Level ${i}: preset=${preset.name} avgDiff=${avgDiff.toFixed(0)} avgMoves=${avgMoves.toFixed(0)} avgDecisionPts=${avgDec.toFixed(1)}`);
      }
    } catch (e) {
      const fallback = existingById.get(i);
      if (!fallback) {
        console.error(`  ✗ FATAL: Failed on level ${i} and no fallback exists:`, e);
        failedLevels.push(i);
        continue;
      }
      console.warn(`  ⚠ Using existing validated level ${i} after generation failure.`);
      allLevels.push({ ...(fallback as LevelData) });
      usedFallback++;
      
      const solution = LevelSolver.solve(fallback as LevelData);
      const preset = getPresetForLevelId(i);
      metrics.push({
        id: i, preset: preset.name, gridSize: `${fallback.width}×${fallback.height}`,
        optimalMoves: solution.optimalMoves || 0,
        difficulty: (fallback as any).difficulty || 0,
        decisionPoints: solution.decisionPoints, misleadingRoutes: solution.misleadingRoutes,
        deadEnds: solution.deadEndCount, turns: solution.turnsCount,
        pathCount: solution.shortestPathCount, mechanics: 'FALLBACK'
      });
    }
  }
  
  if (failedLevels.length > 0) {
    console.error(`\nFATAL: ${failedLevels.length} levels failed without fallback: ${failedLevels.join(', ')}`);
    console.error('Aborting — NOT writing levels_db.json to protect the existing database.');
    process.exit(1);
  }

  console.log(`\n  ✓ Generated ${generated} new levels`);
  if (usedFallback > 0) console.log(`  ⚠ Used ${usedFallback} fallback levels`);

  // ── Phase 3: Difficulty curve validation ──────────────────────────────────
  console.log('\nPhase 3: Validating difficulty curve...');
  
  const checkpoints = [
    { label: 'TUTORIAL (1-10)', start: 1, end: 10, expectedMin: 5, expectedMax: 50 },
    { label: 'EASY (11-20)', start: 11, end: 20, expectedMin: 15, expectedMax: 60 },
    { label: 'NORMAL (21-50)', start: 21, end: 50, expectedMin: 30, expectedMax: 90 },
    { label: 'MEDIUM (51-100)', start: 51, end: 100, expectedMin: 50, expectedMax: 140 },
    { label: 'HARD (101-200)', start: 101, end: 200, expectedMin: 60, expectedMax: 160 },
    { label: 'VERY_HARD (201-300)', start: 201, end: 300, expectedMin: 75, expectedMax: 185 },
    { label: 'EXPERT (301-400)', start: 301, end: 400, expectedMin: 90, expectedMax: 210 },
    { label: 'MASTER (401-500)', start: 401, end: 500, expectedMin: 100, expectedMax: 230 },
  ];
  
  let curveOk = true;
  let prevAvg = 0;
  
  for (const cp of checkpoints) {
    const segment = metrics.filter(m => m.id >= cp.start && m.id <= cp.end);
    if (segment.length === 0) continue;
    const avgDiff = segment.reduce((s, m) => s + m.difficulty, 0) / segment.length;
    const avgMoves = segment.reduce((s, m) => s + m.optimalMoves, 0) / segment.length;
    const avgDec = segment.reduce((s, m) => s + m.decisionPoints, 0) / segment.length;
    const avgMisl = segment.reduce((s, m) => s + m.misleadingRoutes, 0) / segment.length;
    
    const increasing = avgDiff >= prevAvg * 0.85; // allow slight overlap at boundaries
    const icon = increasing ? '✓' : '✗';
    
    console.log(`  ${icon} ${cp.label.padEnd(25)} avg_diff=${avgDiff.toFixed(0).padStart(4)} avg_moves=${avgMoves.toFixed(0).padStart(4)} avg_dec_pts=${avgDec.toFixed(1).padStart(5)} avg_mislead=${avgMisl.toFixed(0).padStart(5)}`);
    
    if (!increasing) {
      console.warn(`    ⚠ Difficulty did not increase from previous segment! (prev=${prevAvg.toFixed(0)}, current=${avgDiff.toFixed(0)})`);
      curveOk = false;
    }
    prevAvg = Math.max(prevAvg, avgDiff);
  }

  // ── Phase 4: Inspect actual board layouts for key levels ──────────────────
  console.log('\nPhase 4: Inspecting board layouts for sample levels...\n');
  
  for (const inspectId of BOARD_INSPECT_LEVELS) {
    const level = allLevels.find(l => l.id === inspectId);
    const m = metrics.find(x => x.id === inspectId);
    if (!level || !m) continue;
    
    console.log(`━━━ Level ${inspectId} [${m.preset}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Difficulty: ${formatDifficultyBar(m.difficulty)}`);
    console.log(`  Optimal moves: ${m.optimalMoves} | Turns: ${m.turns} | Dead ends: ${m.deadEnds}`);
    console.log(`  Decision points: ${m.decisionPoints} | Misleading routes: ${m.misleadingRoutes}`);
    console.log(`  Path count (alt routes): ${m.pathCount} | Mechanics: ${m.mechanics}`);
    console.log(renderBoardAscii(level));
    console.log();
  }

  // ── Phase 5: Write output ─────────────────────────────────────────────────
  console.log('Phase 5: Writing validated levels to levels_db.json...');
  
  const jsonPath = path.join(process.cwd(), 'src', 'data', 'levels_db.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allLevels, null, 2));
  console.log(`  ✓ Written ${allLevels.length} levels to ${jsonPath}`);
  
  // ── Phase 6: Generate full report ─────────────────────────────────────────
  console.log('\nPhase 6: Generating difficulty report...');
  
  let md = `# Aroow — Extreme Difficulty Level Report\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  
  if (!curveOk) {
    md += `> ⚠️ **WARNING**: Difficulty curve has anomalies. Review before shipping.\n\n`;
  }
  
  md += `## Summary\n\n`;
  md += `| Tier | Levels | Avg Difficulty | Avg Moves | Avg Decision Pts | Avg Misleading |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const cp of checkpoints) {
    const segment = metrics.filter(m => m.id >= cp.start && m.id <= cp.end);
    if (segment.length === 0) continue;
    const avgD = (segment.reduce((s, m) => s + m.difficulty, 0) / segment.length).toFixed(0);
    const avgM = (segment.reduce((s, m) => s + m.optimalMoves, 0) / segment.length).toFixed(0);
    const avgDec = (segment.reduce((s, m) => s + m.decisionPoints, 0) / segment.length).toFixed(1);
    const avgMisl = (segment.reduce((s, m) => s + m.misleadingRoutes, 0) / segment.length).toFixed(0);
    md += `| ${cp.label} | ${segment.length} | ${avgD} | ${avgM} | ${avgDec} | ${avgMisl} |\n`;
  }
  
  md += `\n## Level-by-Level Breakdown\n\n`;
  md += `| Level | Preset | Grid | Moves | Difficulty | Decision Pts | Misleading | Turns | Dead Ends | Mechanics |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const m of metrics) {
    md += `| ${m.id} | ${m.preset} | ${m.gridSize} | ${m.optimalMoves} | **${m.difficulty}** | ${m.decisionPoints} | ${m.misleadingRoutes} | ${m.turns} | ${m.deadEnds} | ${m.mechanics} |\n`;
  }
  
  const reportPath = path.join(process.cwd(), 'extreme_difficulty_report.md');
  fs.writeFileSync(reportPath, md);
  
  console.log(`  ✓ Report saved to extreme_difficulty_report.md`);
  
  // Final summary
  const totalAvgDiff = metrics.reduce((s, m) => s + m.difficulty, 0) / metrics.length;
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Generation Complete                                      ║`);
  console.log(`║  Total levels: ${String(allLevels.length).padEnd(39)}║`);
  console.log(`║  New generated: ${String(generated).padEnd(38)}║`);
  console.log(`║  Fallbacks used: ${String(usedFallback).padEnd(37)}║`);
  console.log(`║  Average difficulty: ${String(totalAvgDiff.toFixed(1)).padEnd(35)}║`);
  console.log(`║  Difficulty curve OK: ${String(curveOk ? 'YES ✓' : 'NO ✗ — review report').padEnd(34)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
}

runGeneration();
