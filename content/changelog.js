// Changelog content for /changelog, newest first. Edit this list to add entries.
// Each change tag is one of: 'new' | 'improved' | 'fixed'.
module.exports = [
  {
    date: '2026-06-13',
    title: 'Launch infrastructure & conversion polish',
    changes: [
      { tag: 'new', text: 'PowVal is live at powval.com over HTTPS (Cloudflare in front of a Sydney server).' },
      { tag: 'new', text: 'Signups now stored in a database, with automated daily backups and an evening email report.' },
      { tag: 'improved', text: 'The hero captures your email right in the first screen, with clearer paths for skiers vs ski shops.' },
      { tag: 'improved', text: 'Accessibility and contrast pass, plus a branded link-preview card for sharing.' },
      { tag: 'improved', text: 'Push-to-deploy: updates now ship automatically.' },
    ],
  },
  {
    date: '2026-06-11',
    title: 'Renamed to PowVal',
    changes: [
      { tag: 'improved', text: 'Rebranded from GearWorth to PowVal, with a new logo and identity on the powval.com domain.' },
    ],
  },
  {
    date: '2026-06-10',
    title: 'Ski-shop track & conversion overhaul',
    changes: [
      { tag: 'new', text: 'Added a track for ski shops wanting bulk trade-in pricing, alongside the consumer waitlist.' },
      { tag: 'improved', text: 'Reworked the page for clarity and conversion.' },
      { tag: 'fixed', text: 'Anti-spam protection on the signup form.' },
    ],
  },
  {
    date: '2026-06-09',
    title: 'Waitlist launch',
    changes: [
      { tag: 'new', text: 'Launched the PowVal waitlist landing page, with the animated valuation preview and live snow.' },
    ],
  },
];
