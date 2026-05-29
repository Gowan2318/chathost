/** Sample addresses for autocomplete when Google Maps API is unavailable */
const SAMPLE_ADDRESSES = [
  { street: "123 Main St", city: "Springfield", state: "IL", zip: "62701" },
  { street: "456 Oak Ave", city: "Austin", state: "TX", zip: "78701" },
  { street: "789 Pine Rd", city: "Denver", state: "CO", zip: "80202" },
  { street: "210 Market St", city: "San Francisco", state: "CA", zip: "94105" },
  { street: "88 Broadway", city: "New York", state: "NY", zip: "10012" },
  { street: "1500 Peachtree St", city: "Atlanta", state: "GA", zip: "30309" },
  { street: "742 Evergreen Terrace", city: "Portland", state: "OR", zip: "97201" },
  { street: "1600 Pennsylvania Ave", city: "Washington", state: "DC", zip: "20500" },
];

export function formatAddressLine({ street = "", city = "", state = "", zip = "" }) {
  const st = street.trim();
  const c = city.trim();
  const s = state.trim();
  const z = zip.trim();
  if (!st && !c && !s && !z) return "";
  const stateZip = [s, z].filter(Boolean).join(" ");
  return [st, c, stateZip].filter(Boolean).join(", ");
}

export function parseAddressInput(input) {
  const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { street: "", city: "", state: "", zip: "" };
  }
  if (parts.length === 1) {
    return { street: parts[0], city: "", state: "", zip: "" };
  }
  if (parts.length === 2) {
    return { street: parts[0], city: parts[1], state: "", zip: "" };
  }
  const street = parts[0];
  const city = parts[1];
  const last = parts[parts.length - 1];
  const zipMatch = last.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch ? zipMatch[1] : "";
  const stateMatch = last.match(/\b([A-Za-z]{2})\b/);
  const state = stateMatch ? stateMatch[1].toUpperCase() : "";
  return { street, city, state, zip };
}

export function getAddressSuggestions(query, limit = 5) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const parsed = parseAddressInput(query);
  const formattedCurrent = formatAddressLine(parsed);
  const results = new Set();

  if (formattedCurrent.length > 3) {
    results.add(formattedCurrent);
  }

  for (const addr of SAMPLE_ADDRESSES) {
    const line = formatAddressLine(addr);
    if (line.toLowerCase().includes(q)) {
      results.add(line);
    }
  }

  if (parsed.street && parsed.city) {
    results.add(
      formatAddressLine({
        street: parsed.street,
        city: parsed.city,
        state: parsed.state || "ST",
        zip: parsed.zip || "00000",
      })
    );
  }

  return [...results].slice(0, limit);
}

export function addressFromFormattedLine(line) {
  return parseAddressInput(line);
}
