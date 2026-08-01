const STATE_INFO = {
  // USA
  AL: { name: 'Alabama', group: 'USA' },
  AK: { name: 'Alaska', group: 'USA' },
  AZ: { name: 'Arizona', group: 'USA' },
  AR: { name: 'Arkansas', group: 'USA' },
  CA: { name: 'California', group: 'USA' },
  CO: { name: 'Colorado', group: 'USA' },
  CT: { name: 'Connecticut', group: 'USA' },
  DE: { name: 'Delaware', group: 'USA' },
  FL: { name: 'Florida', group: 'USA' },
  GA: { name: 'Georgia', group: 'USA' },
  HI: { name: 'Hawaii', group: 'USA' },
  ID: { name: 'Idaho', group: 'USA' },
  IL: { name: 'Illinois', group: 'USA' },
  IN: { name: 'Indiana', group: 'USA' },
  IA: { name: 'Iowa', group: 'USA' },
  KS: { name: 'Kansas', group: 'USA' },
  KY: { name: 'Kentucky', group: 'USA' },
  LA: { name: 'Louisiana', group: 'USA' },
  ME: { name: 'Maine', group: 'USA' },
  MD: { name: 'Maryland', group: 'USA' },
  MA: { name: 'Massachusetts', group: 'USA' },
  MI: { name: 'Michigan', group: 'USA' },
  MN: { name: 'Minnesota', group: 'USA' },
  MS: { name: 'Mississippi', group: 'USA' },
  MO: { name: 'Missouri', group: 'USA' },
  MT: { name: 'Montana', group: 'USA' },
  NE: { name: 'Nebraska', group: 'USA' },
  NV: { name: 'Nevada', group: 'USA' },
  NH: { name: 'New Hampshire', group: 'USA' },
  NJ: { name: 'New Jersey', group: 'USA' },
  NM: { name: 'New Mexico', group: 'USA' },
  NY: { name: 'New York', group: 'USA' },
  NC: { name: 'North Carolina', group: 'USA' },
  ND: { name: 'North Dakota', group: 'USA' },
  OH: { name: 'Ohio', group: 'USA' },
  OK: { name: 'Oklahoma', group: 'USA' },
  OR: { name: 'Oregon', group: 'USA' },
  PA: { name: 'Pennsylvania', group: 'USA' },
  RI: { name: 'Rhode Island', group: 'USA' },
  SC: { name: 'South Carolina', group: 'USA' },
  SD: { name: 'South Dakota', group: 'USA' },
  TN: { name: 'Tennessee', group: 'USA' },
  TX: { name: 'Texas', group: 'USA' },
  UT: { name: 'Utah', group: 'USA' },
  VT: { name: 'Vermont', group: 'USA' },
  VA: { name: 'Virginia', group: 'USA' },
  WA: { name: 'Washington', group: 'USA' },
  WV: { name: 'West Virginia', group: 'USA' },
  WI: { name: 'Wisconsin', group: 'USA' },
  WY: { name: 'Wyoming', group: 'USA' },
  DC: { name: 'District of Columbia', group: 'USA' },

  // Canada
  AB: { name: 'Alberta', group: 'Canada' },
  BC: { name: 'British Columbia', group: 'Canada' },
  MB: { name: 'Manitoba', group: 'Canada' },
  NB: { name: 'New Brunswick', group: 'Canada' },
  NL: { name: 'Newfoundland and Labrador', group: 'Canada' },
  NS: { name: 'Nova Scotia', group: 'Canada' },
  NT: { name: 'Northwest Territories', group: 'Canada' },
  NU: { name: 'Nunavut', group: 'Canada' },
  ON: { name: 'Ontario', group: 'Canada' },
  PE: { name: 'Prince Edward Island', group: 'Canada' },
  QC: { name: 'Quebec', group: 'Canada' },
  SK: { name: 'Saskatchewan', group: 'Canada' },
  YT: { name: 'Yukon', group: 'Canada' },

  // US Territories
  AS: { name: 'American Samoa', group: 'US Territories' },
  GU: { name: 'Guam', group: 'US Territories' },
  MP: { name: 'Northern Mariana Islands', group: 'US Territories' },
  PR: { name: 'Puerto Rico', group: 'US Territories' },
  VI: { name: 'U.S. Virgin Islands', group: 'US Territories' },
}

const GROUP_ORDER = ['USA', 'Canada', 'US Territories', 'Other']

export function getStateName(code) {
  return STATE_INFO[code]?.name || code
}

export function groupStates(codes = []) {
  const groups = Object.fromEntries(GROUP_ORDER.map((label) => [label, []]))

  codes.forEach((code) => {
    const group = STATE_INFO[code]?.group || 'Other'
    groups[group].push(code)
  })

  return GROUP_ORDER
    .map((label) => ({
      label,
      states: groups[label].sort((a, b) =>
        getStateName(a).localeCompare(getStateName(b))
      ),
    }))
    .filter((group) => group.states.length > 0)
}
