// Roadmap content for /roadmap. Edit this list to update the page.
// Each item status is one of: 'done' | 'active' | 'planned'.
module.exports = {
  intro:
    "Where PowVal is, and where it's headed. This updates as things ship: no vapourware, just what's done and what's next.",
  sections: [
    {
      title: 'Foundation',
      items: [
        {
          status: 'done',
          title: 'Waitlist landing page',
          desc: 'Live at powval.com. Explains what is coming and captures early signups.',
        },
        {
          status: 'done',
          title: 'Brand & identity',
          desc: 'PowVal name, logo, and the alpine look across the site.',
        },
        {
          status: 'done',
          title: 'Two signup tracks',
          desc: 'Separate lists for skiers selling their own gear and ski shops wanting trade-in pricing.',
        },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        {
          status: 'done',
          title: 'Hosting & HTTPS',
          desc: 'Running on a Sydney server behind Cloudflare.',
        },
        {
          status: 'done',
          title: 'Signup database',
          desc: 'Signups stored in SQLite: queryable and durable.',
        },
        {
          status: 'done',
          title: 'Automated backups',
          desc: 'Database backed up daily, with an email report every evening.',
        },
        {
          status: 'done',
          title: 'One-command deploys',
          desc: 'Push to main and the site updates itself.',
        },
      ],
    },
    {
      title: 'The estimator',
      items: [
        {
          status: 'active',
          title: 'Real sold-price data',
          desc: 'Sourcing eBay AU sold prices, the foundation every estimate is built on. Data access applied for.',
        },
        {
          status: 'planned',
          title: 'Gear catalog',
          desc: 'A reference list of ski & snowboard models so your input matches real gear.',
        },
        {
          status: 'planned',
          title: 'Valuation engine',
          desc: 'Turn comparable sales into an honest price range: low, expected, high.',
        },
        {
          status: 'planned',
          title: 'Live estimator on the site',
          desc: 'Replace the hero demo with the real thing: enter your gear, get a number.',
        },
      ],
    },
    {
      title: 'Marketplace',
      items: [
        {
          status: 'planned',
          title: 'Buy & sell listings',
          desc: 'List your gear to buyers who already know what it is.',
        },
        {
          status: 'planned',
          title: 'Shop trade-in tools',
          desc: 'Bulk valuations so shops can price a full rack of trade-ins at once.',
        },
      ],
    },
    {
      title: 'Exploring',
      items: [
        {
          status: 'planned',
          title: 'Snap-to-value',
          desc: 'Photograph your skis and have the details filled in for you.',
        },
        {
          status: 'planned',
          title: 'Smarter pricing model',
          desc: 'A trained model, once there is enough data to beat the simple approach.',
        },
        {
          status: 'planned',
          title: 'Beyond skis & boards',
          desc: 'Boots, bindings, and outerwear.',
        },
      ],
    },
  ],
};
