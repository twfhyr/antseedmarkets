// Primary tabs. Hidden items stay routed (bookmarks still work) so this
// list can be un-hidden later without rewriting URLs.
export const PRIMARY_NAV = [
  { tab: 'stake', hidden: false },
  { tab: 'providers', hidden: false },
  { tab: 'chat', hidden: false },
  { tab: 'market', hidden: false },
  { tab: 'discovery', hidden: true },
  { tab: 'leaderboard', hidden: true },
  { tab: 'portfolio', hidden: true },
  { tab: 'rewards', hidden: true },
];

export function visiblePrimaryNav() {
  return PRIMARY_NAV.filter((item) => !item.hidden);
}
