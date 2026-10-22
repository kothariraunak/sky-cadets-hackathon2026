// IATA Bar Coded Boarding Pass (the PDF417 / Aztec / QR code on every boarding pass).
export function parseBoardingPass(text) {
  if (!text || text[0] !== 'M' || text.length < 52) return null
  const carrier = text.slice(36, 39).trim()
  const number = text.slice(39, 44).trim().replace(/^0+/, '')
  const seat = text.slice(48, 52).trim().replace(/^0+/, '')
  const day = text.slice(44, 47).trim() // flight date as day of the year (Julian date)
  if (!carrier || !number) return null
  return { flight_number: carrier + number, seat, day, from: text.slice(30, 33), to: text.slice(33, 36) }
}
