function displayText(value) {
  if (value == null || typeof value === "object") return "";
  return String(value).trim();
}

function firstText(...values) {
  return values.map(displayText).find(Boolean) || "";
}

export function textOrDash(value) {
  const text = displayText(value);
  return text || "--";
}

export function householdLabel(values, separator = "｜", fallback = "--") {
  const parts = (Array.isArray(values) ? values : [])
    .map(displayText)
    .filter(Boolean);
  return parts.length ? parts.join(separator) : fallback;
}

export function getDoorNo(data) {
  return firstText(data?.doorNo, data?.door_no);
}

export function getFloorNo(data) {
  return firstText(data?.floorNo, data?.floor_no);
}

export function getParkingSpaceNo(data) {
  return firstText(data?.parkingSpaceNo, data?.parking_space_no);
}

export function getCardHolderName(data) {
  return firstText(data?.cardHolderName, data?.card_holder_name);
}

export function getFirstCardHolderName(account) {
  const accountName = firstText(
    account?.firstCardHolderName,
    account?.first_card_holder_name
  );
  if (accountName) return accountName;

  const cards = Array.isArray(account?.cards) ? account.cards : [];
  return cards.map(getCardHolderName).find(Boolean) || "";
}

export function fullHouseholdLabel(data, separator = "／", fallback = "--") {
  return householdLabel(
    [getDoorNo(data), getFloorNo(data), getParkingSpaceNo(data)],
    separator,
    fallback
  );
}

export function normalizeIdTag(value) {
  return String(value ?? "").trim().toUpperCase();
}
