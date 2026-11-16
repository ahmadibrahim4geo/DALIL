/* Contract test: the grid legend offers exactly the five states an operator needs,
 * while a cell's popup can still report its precise sub-state (partial / capped / unknown).
 * Pure module: no DOM, no browser APIs. */
'use strict';
const assert = require('assert');
const Grid = require('../core/grid-presentation.js');

// 1. Five visible states, in the order the operator reads them.
assert.deepStrictEqual(
  Grid.definitions.map(entry => entry.id),
  ['pending', 'processing', 'complete', 'confirmed_empty', 'error'],
  'the legend must not grow beyond the five agreed states'
);

// 2. Sub-states are folded into the five buckets instead of adding squares.
const styleOf = status => Grid.style(status);
assert.deepStrictEqual(styleOf('partial'), styleOf('complete'), 'a partial cell renders as a completed cell');
assert.deepStrictEqual(styleOf('capped'), styleOf('complete'), 'a capped cell renders as a completed cell');
assert.deepStrictEqual(styleOf('unknown'), styleOf('error'), 'an unverified cell renders as an error cell');
assert.deepStrictEqual(styleOf('blocked'), styleOf('error'), 'a blocked source renders as an error cell');
assert.deepStrictEqual(styleOf('running'), styleOf('processing'), 'a running scan renders as scanning');
assert.deepStrictEqual(styleOf('done'), styleOf('complete'));

// 3. Every bucket has its own colour, so the five states stay distinguishable.
const colours = new Set(Grid.definitions.map(entry => entry.color));
assert.strictEqual(colours.size, Grid.definitions.length, 'each visible state needs its own colour');

// 4. The precise state is preserved for the popup, which is where honesty lives.
const partialCell = { id: 'c1', status: 'partial', itemsFound: 3, statusByQuery: { Q1: { status: 'partial' } } };
assert.strictEqual(Grid.state(partialCell), 'partial', 'the popup must keep saying "partial", not "complete"');
const cappedCell = { id: 'c2', status: 'capped', itemsFound: 120, statusByQuery: { Q1: { status: 'capped' } } };
assert.strictEqual(Grid.state(cappedCell), 'capped', 'a capped cell keeps its own wording in the popup');
const unknownCell = { id: 'c3', status: 'unknown', itemsFound: 0, statusByQuery: { Q1: { status: 'unknown' } } };
assert.strictEqual(Grid.state(unknownCell), 'unknown');
assert.strictEqual(Grid.bucket('partial'), 'complete');
assert.strictEqual(Grid.bucket('unknown'), 'error');
assert.strictEqual(Grid.bucket('error'), 'error');

// 5. A completed cell with zero records is shown as empty, never as completed.
const emptyCell = { id: 'c4', status: 'complete', itemsFound: 0, statusByQuery: { Q1: { status: 'complete' } } };
assert.strictEqual(Grid.state(emptyCell), 'confirmed_empty');

// 6. A cell read through a viewport narrower than the cell is not shown as completed.
const shortCoverageCell = { id: 'c5', status: 'partial', itemsFound: 5,
  statusByQuery: { Q1: { status: 'partial', scans: [{ status: 'partial', coverageIncomplete: true }] } } };
assert.strictEqual(Grid.state(shortCoverageCell), 'coverage_incomplete', 'incomplete coverage must not read as done');
assert.deepStrictEqual(Grid.style(Grid.state(shortCoverageCell)), Grid.style('error'), 'it is drawn in the error bucket');
assert.strictEqual(Grid.bucket('coverage_incomplete'), 'error');
assert.strictEqual(Grid.coverageIncomplete({ statusByQuery: { Q1: { scans: [{ coverageIncomplete: true }] } } }), true);
assert.strictEqual(Grid.coverageIncomplete(partialCell), false);

// 7. Ownership visibility still depends on the owner cell having been surveyed.
const cells = [
  { id: 'a', status: 'pending', statusByQuery: {} },
  { id: 'b', status: 'complete', statusByQuery: { Q1: { status: 'complete' } } }
];
assert.strictEqual(Grid.ownerVisited({ ownerCellId: 'b' }, cells), true);
assert.strictEqual(Grid.ownerVisited({ ownerCellId: 'a' }, cells), false, 'an unsurveyed owner stays an early discovery');
assert.strictEqual(Grid.ownerVisited({}, []), true);

console.log('PASS grid legend: five visible states, sub-states folded for display and preserved in the popup');
