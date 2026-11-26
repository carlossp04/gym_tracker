import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidTrainingDate, formatDateInput, formatDisplayDate, parseDateInput, parseTrainingDate } from '../src/lib/trainingDates.js';
import { parseWhatsAppChat } from '../src/lib/whatsappParser.js';
import { getWeeklyVolumeChartData } from '../src/lib/gymMetrics.js';

for (const [zone, mondayLabel] of [['UTC', '30/03'], ['Europe/Madrid', '30/03'], ['America/Los_Angeles', '23/03']]) {
  test(`existing date labels, entry IDs and weekly volume in ${zone}`, (t) => {
    const previous = process.env.TZ;
    process.env.TZ = zone;
    t.after(() => { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; });
    for (const raw of ['30/03/26', '30.3.2026', '30-03-2026']) {
      const date = parseTrainingDate(raw);
      assert.equal(formatDateInput(date), '2026-03-30');
      assert.equal(formatDisplayDate(parseDateInput('2026-03-30')), '30/03/2026');
      const data = parseWhatsAppChat(`[${raw}, 12:00] Ana: Press\n1 x 8 x 10`);
      assert.equal(data.Ana[0].date, raw);
      assert.equal(data.Ana[0].id, `ana__${raw}__press__0`);
    }
    const data = parseWhatsAppChat('[30/03/26, 12:00] Ana: Press\n1 x 8 x 10');
    assert.deepEqual(getWeeklyVolumeChartData(data), [{ week: mondayLabel, Ana: 80, Ana__reps: 8 }]);
  });
}

test('history date edits accept supported calendar dates and reject incomplete or impossible ones', () => {
  for (const date of [' 1/2/26 ', '29-2-2024', '29.02.00', '31/12/2026']) {
    assert.equal(isValidTrainingDate(date), true, date);
  }
  for (const date of [null, 23, '', 'Monday', '4/10', '00/10/26', '29/2/1900', '31/04/26', '01/13/26', '2026-12-31']) {
    assert.equal(isValidTrainingDate(date), false, String(date));
  }
});
